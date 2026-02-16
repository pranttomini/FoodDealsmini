import React, { useState, useEffect, useMemo } from 'react';
import { Map, List, Plus, SlidersHorizontal, User, FilterX } from 'lucide-react';
import { Deal, DealType, DietaryTag, FilterState, CuisineType, Language } from '../types';
import { BERLIN_CENTER, INITIAL_FILTERS } from '../constants';
import { DealCard } from '../components/DealCard';
import { MapBoard } from '../components/MapBoard';
import { DealDetailModal } from '../components/DealDetailModal';
import { PostDealForm } from '../components/PostDealForm';
import { ProfileModal } from '../components/ProfileModal';
import { getTranslation } from '../translations';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../components/Toast';
import { useDeals } from '../hooks/useDeals';
import { convertSupabaseDealToLegacy, calculateDistance, formatDistance } from '../utils/dataAdapters';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

type ActiveScreen = 'home' | 'detail' | 'profile';

function HomeScreen() {
  const { user, profile, session, refreshProfile } = useAuth();
  const { isDark } = useTheme();
  const { showToast } = useToast();
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('home');
  const [language, setLanguage] = useState<Language>('de');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>(BERLIN_CENTER);

  // Initialise language from saved profile preference
  useEffect(() => {
    if (profile?.language_preference === 'en' || profile?.language_preference === 'de') {
      setLanguage(profile.language_preference as Language);
    }
  }, [profile?.language_preference]);

  // Persist language change to profiles table
  const handleSetLanguage = async (lang: Language) => {
    setLanguage(lang);
    if (user?.id && session?.access_token) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ language_preference: lang }),
        });
      } catch {}
    }
  };

  // Get user geolocation on mount
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {} // Permission denied – stay with Berlin center fallback
      );
    }
  }, []);

  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [showPostForm, setShowPostForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filter State
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);

  // User's votes: deal_id -> 1 (up) | -1 (down)
  const [userVotes, setUserVotes] = useState<Record<string, number>>({});
  // Pending optimistic vote-count deltas (cleared when votes are refetched from DB)
  const [voteDeltas, setVoteDeltas] = useState<Record<string, number>>({});

  // Fetch deals from Supabase
  const { deals: supabaseDeals, loading, error, refetch } = useDeals();

  const t = (key: any) => getTranslation(language, key);

  // Fetch current user's votes whenever deals or user changes
  useEffect(() => {
    if (!user?.id || !supabaseDeals?.length) return;

    const dealIds = supabaseDeals.map(d => d.id);
    const fetchVotes = async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/votes?user_id=eq.${user.id}&deal_id=in.(${dealIds.join(',')})`,
          { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session?.access_token || SUPABASE_KEY}` } }
        );
        if (res.ok) {
          const votes = await res.json();
          const map: Record<string, number> = {};
          (votes || []).forEach((v: any) => { map[v.deal_id] = v.vote_type === 'up' ? 1 : -1; });
          setUserVotes(map);
          setVoteDeltas({}); // DB is now the source of truth — clear pending deltas
        }
      } catch (err) {
        console.error('[HomeScreen] Error fetching user votes:', err);
      }
    };
    fetchVotes();
  }, [user?.id, supabaseDeals, session?.access_token]);

  // Convert Supabase deals to legacy format with distance calculation
  const legacyDeals = useMemo(() => {
    if (!supabaseDeals) return [];

    return supabaseDeals.map(deal => {
      const legacyDeal = convertSupabaseDealToLegacy(deal);

      // Calculate distance from user location
      const distKm = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        legacyDeal.location.lat,
        legacyDeal.location.lng
      );

      return {
        ...legacyDeal,
        distance: formatDistance(distKm),
        _rawDistance: distKm,
      };
    });
  }, [supabaseDeals, userLocation]);

  // Filter deals
  const filteredDeals = useMemo(() => {
    return legacyDeals.filter((deal: any) => {
      if (deal.price > filters.maxPrice) return false;
      if (deal._rawDistance > filters.maxDistance) return false;
      if (filters.tags.length > 0 && !filters.tags.some((tag: DietaryTag) => deal.tags.includes(tag))) return false;
      if (filters.types.length > 0 && !filters.types.includes(deal.dealType)) return false;
      if (filters.cuisines.length > 0 && !filters.cuisines.includes(deal.cuisine)) return false;
      return true;
    });
  }, [legacyDeals, filters]);

  // Overlay current user's votes + optimistic vote-count deltas onto filtered deals
  const dealsWithVotes = useMemo(() =>
    filteredDeals.map(d => ({
      ...d,
      userVote: userVotes[d.id] ?? 0,
      votes: d.votes + (voteDeltas[d.id] || 0),
    })),
    [filteredDeals, userVotes, voteDeltas]
  );

  // Derive selectedDeal from live data so votes/refetch auto-update detail modal
  const selectedDeal = useMemo(() => {
    if (!selectedDealId) return null;
    const deal = legacyDeals.find(d => d.id === selectedDealId);
    return deal ? {
      ...deal,
      userVote: userVotes[deal.id] ?? 0,
      votes: deal.votes + (voteDeltas[deal.id] || 0),
    } : null;
  }, [selectedDealId, legacyDeals, userVotes, voteDeltas]);

  const activeFilterCount = filters.tags.length + filters.types.length + filters.cuisines.length +
    (filters.maxPrice < 30 ? 1 : 0) + (filters.maxDistance < 10 ? 1 : 0);

  const handleVote = async (deal: Deal, direction: number) => {
    if (!user || !session) return;

    // Optimistic update: toggle off if same direction, else set new direction
    const currentVote = userVotes[deal.id] || 0;
    const newVote = currentVote === direction ? 0 : direction;
    setUserVotes(prev => ({ ...prev, [deal.id]: newVote }));
    // Adjust displayed vote count optimistically (newVote - currentVote = delta)
    setVoteDeltas(prev => ({ ...prev, [deal.id]: (prev[deal.id] || 0) + (newVote - currentVote) }));

    try {
      const voteType = direction === 1 ? 'up' : 'down';
      const headers = {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${session.access_token}`,
      };

      // Check existing vote
      const checkRes = await fetch(
        `${SUPABASE_URL}/rest/v1/votes?deal_id=eq.${deal.id}&user_id=eq.${user.id}`,
        { headers }
      );
      const existingVotes = await checkRes.json();
      const existingVote = existingVotes?.[0];

      if (existingVote) {
        if (existingVote.vote_type === voteType) {
          // Toggle off: delete the vote
          await fetch(`${SUPABASE_URL}/rest/v1/votes?id=eq.${existingVote.id}`, {
            method: 'DELETE',
            headers,
          });
        } else {
          // Change direction
          await fetch(`${SUPABASE_URL}/rest/v1/votes?id=eq.${existingVote.id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ vote_type: voteType }),
          });
        }
      } else {
        // New vote
        await fetch(`${SUPABASE_URL}/rest/v1/votes`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ deal_id: deal.id, user_id: user.id, vote_type: voteType }),
        });
      }
      refetch(); // Immediately refresh deal list after vote
    } catch (err) {
      console.error('Error voting:', err);
      // Rollback optimistic update on failure
      setUserVotes(prev => ({ ...prev, [deal.id]: currentVote }));
      setVoteDeltas(prev => ({ ...prev, [deal.id]: (prev[deal.id] || 0) - (newVote - currentVote) }));
    }
  };

  const handleOpenDeal = (deal: Deal) => {
    setSelectedDealId(deal.id);
    setActiveScreen('detail');
  };

  const handleOpenProfile = () => {
    setActiveScreen('profile');
  };

  const toggleTagFilter = (tag: DietaryTag) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag]
    }));
  };

  const handleUpdateDeal = (_updatedDeal: Deal) => {
    // selectedDeal is derived from live data — updates happen automatically via refetch
  };

  const handlePostDeal = async (formData: any) => {
    setShowPostForm(false);
    refetch(); // Immediately fetch the newly posted deal
    showToast(t('dealPosted'));

    // Increment total_deals_posted, award XP, track money saved
    if (user?.id && session?.access_token) {
      try {
        const savings = parseFloat(formData?.originalPrice || '0') - parseFloat(formData?.price || '0');
        await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            total_deals_posted: (profile?.total_deals_posted || 0) + 1,
            xp_points: (profile?.xp_points || 0) + 25,
            total_money_saved: (Number(profile?.total_money_saved) || 0) + Math.max(0, savings),
          }),
        });
        await refreshProfile(); // Refresh profile in context to update badges/stats
      } catch {}
    }
  };

  // User profile for ProfileModal (matched to UserProfile interface)
  const userProfile = useMemo(() => {
    const dealsPosted = profile?.total_deals_posted || 0;
    const xp = profile?.xp_points || 0;

    // Derive badges from profile stats
    const badges = [
      { id: 'first_post', name: 'First Deal', icon: '🍕', description: 'Posted your very first deal', unlocked: dealsPosted >= 1 },
      { id: 'five_posts', name: 'Deal Guru', icon: '🌟', description: 'Posted 5 deals', unlocked: dealsPosted >= 5 },
      { id: 'xp_50', name: 'Rising Star', icon: '⭐', description: 'Earned 50 XP', unlocked: xp >= 50 },
      { id: 'xp_200', name: 'Deal Master', icon: '🏆', description: 'Earned 200 XP', unlocked: xp >= 200 },
      { id: 'early_bird', name: 'Early Bird', icon: '🌅', description: 'Be the first to post a deal today', unlocked: dealsPosted >= 1 },
      { id: 'ten_posts', name: 'Power Poster', icon: '🚀', description: 'Posted 10 deals', unlocked: dealsPosted >= 10 },
    ];

    return {
      name: profile?.username || 'User',
      level: Math.floor(xp / 100) + 1,
      xp,
      dealsPosted,
      moneySaved: Number(profile?.total_money_saved) || 0,
      foodAlerts: [] as string[],
      badges,
    };
  }, [profile]);

  if (loading && !error) {
    return (
      <div className={`h-full w-full flex items-center justify-center ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className={`mt-4 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`h-full w-full flex items-center justify-center ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
        <div className="text-center text-red-400 p-4">
          <p className="font-bold mb-2">{t('loadingError')}</p>
          <p className="text-sm">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg">
            {t('retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full w-full flex flex-col ${isDark ? 'bg-slate-900' : 'bg-gray-50'} relative overflow-hidden`}>

      {/* Top Bar - Only visible on Home Screen */}
      {activeScreen === 'home' && (
        <div className={`absolute top-0 left-0 right-0 z-30 p-4 transition-all duration-300 ${
          viewMode === 'list'
            ? `${isDark ? 'bg-slate-900/95 border-slate-700' : 'bg-gray-50/95 border-gray-200'} backdrop-blur-md shadow-sm border-b`
            : 'pointer-events-none'
        }`}>
          <div className="flex justify-between items-start pointer-events-auto">
            <div className={`${isDark ? 'bg-slate-800/90 text-white' : 'bg-white/90'} backdrop-blur-md shadow-sm rounded-full px-4 py-2 flex items-center gap-2`}>
              <span className="font-extrabold text-lg tracking-tight">Food<span className="text-orange-600">Deals</span></span>
            </div>
            <button
              onClick={handleOpenProfile}
              className={`${isDark ? 'bg-slate-800/90 text-white hover:bg-slate-700' : 'bg-white/90 text-gray-700 hover:bg-white'} backdrop-blur-md p-2 rounded-full shadow-sm transition-colors`}
            >
              <User size={24} />
            </button>
          </div>

          {/* Filter Chips Scroll View */}
          <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar pointer-events-auto pb-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-semibold shadow-sm transition-colors whitespace-nowrap ${
                showFilters || activeFilterCount > 0 ? 'bg-black text-white' : isDark ? 'bg-slate-800 text-white' : 'bg-white text-gray-700'
              }`}
            >
              <SlidersHorizontal size={14} />
              {t('filters')} {activeFilterCount > 0 && `(${activeFilterCount})`}
            </button>

            {/* Quick Filters */}
            {Object.values(DietaryTag).map(tag => (
              <button
                key={tag}
                onClick={() => toggleTagFilter(tag)}
                className={`px-4 py-2 rounded-full text-sm font-medium shadow-sm transition-colors whitespace-nowrap ${
                  filters.tags.includes(tag)
                    ? 'bg-green-100 text-green-800 border-green-200 border'
                    : isDark ? 'bg-slate-800 text-slate-300 border border-transparent' : 'bg-white text-gray-600 border border-transparent'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Expanded Filter Panel */}
      {showFilters && activeScreen === 'home' && (
        <div className={`absolute top-[130px] left-0 right-0 z-20 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border-b shadow-lg p-4 animate-in slide-in-from-top-4 duration-200 max-h-[70vh] overflow-y-auto`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('filters')}</h3>
            <button onClick={() => setFilters(INITIAL_FILTERS)} className="text-xs text-red-500 font-medium flex items-center gap-1">
              <FilterX size={12} /> {t('reset')}
            </button>
          </div>

          <div className="mb-6">
            <div className={`flex justify-between text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'} mb-2`}>
              <span>{t('maxPrice')}</span>
              <span className={`font-bold ${isDark ? 'text-white' : ''}`}>{filters.maxPrice}€</span>
            </div>
            <input
              type="range"
              min="1"
              max="30"
              value={filters.maxPrice}
              onChange={(e) => setFilters({...filters, maxPrice: parseInt(e.target.value)})}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
            />
          </div>

          <div className="mb-6">
            <div className={`flex justify-between text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'} mb-2`}>
              <span>{t('maxDistance')}</span>
              <span className={`font-bold ${isDark ? 'text-white' : ''}`}>{filters.maxDistance} {t('km')}</span>
            </div>
            <input
              type="range"
              min="1"
              max="20"
              step="0.5"
              value={filters.maxDistance}
              onChange={(e) => setFilters({...filters, maxDistance: parseFloat(e.target.value)})}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
            />
          </div>

          <div className="mb-6">
            <h4 className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-gray-500'} uppercase mb-2`}>{t('cuisine')}</h4>
            <div className="flex flex-wrap gap-2">
              {Object.values(CuisineType).map(cuisine => (
                <button
                  key={cuisine}
                  onClick={() => setFilters(prev => ({
                    ...prev,
                    cuisines: prev.cuisines.includes(cuisine) ? prev.cuisines.filter(c => c !== cuisine) : [...prev.cuisines, cuisine]
                  }))}
                  className={`px-3 py-1 rounded-md text-xs font-medium border ${
                    filters.cuisines.includes(cuisine) ? 'bg-orange-50 border-orange-500 text-orange-700' : isDark ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}
                >
                  {cuisine}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-2">
            <h4 className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-gray-500'} uppercase mb-2`}>{t('dealType')}</h4>
            <div className="flex flex-wrap gap-2">
              {Object.values(DealType).map(type => (
                <button
                  key={type}
                  onClick={() => setFilters(prev => ({
                    ...prev,
                    types: prev.types.includes(type) ? prev.types.filter(t => t !== type) : [...prev.types, type]
                  }))}
                  className={`px-3 py-1 rounded-md text-xs font-medium border ${
                    filters.types.includes(type) ? 'bg-orange-50 border-orange-500 text-orange-700' : isDark ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden">
        {viewMode === 'map' ? (
          <MapBoard
            deals={dealsWithVotes}
            onDealClick={handleOpenDeal}
            center={userLocation}
            lang={language}
            darkMode={isDark}
          />
        ) : (
          <div className={`h-full overflow-y-auto p-4 pt-36 pb-24 ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`font-bold ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{dealsWithVotes.length} {t('dealsNearby')}</h2>
            </div>
            {dealsWithVotes.map(deal => (
              <DealCard
                key={deal.id}
                deal={deal}
                onClick={handleOpenDeal}
                onVote={handleVote}
                lang={language}
              />
            ))}
            {dealsWithVotes.length === 0 && (
              <div className={`text-center py-10 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                <p>{t('noDeals')}</p>
                <button onClick={() => setFilters(INITIAL_FILTERS)} className="mt-2 text-blue-500 underline">{t('clearFilters')}</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation & FAB - Only on Home */}
      {activeScreen === 'home' && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-4 z-40">
          {/* View Toggle */}
          <div className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'} shadow-xl rounded-full p-1.5 flex border`}>
            <button
              onClick={() => setViewMode('map')}
              className={`p-3 rounded-full transition-all ${viewMode === 'map' ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Map size={20} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-3 rounded-full transition-all ${viewMode === 'list' ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <List size={20} />
            </button>
          </div>

          {/* POST FAB */}
          <button
            onClick={() => setShowPostForm(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white p-4 rounded-full shadow-xl shadow-orange-500/30 transition-transform active:scale-95 flex items-center justify-center"
          >
            <Plus size={28} />
          </button>
        </div>
      )}

      {/* Pages (Full Screen Overlays) */}

      {activeScreen === 'detail' && selectedDeal && (
        <DealDetailModal
          deal={selectedDeal}
          onClose={() => { setActiveScreen('home'); refetch(); }}
          onUpdateDeal={handleUpdateDeal}
          onVote={handleVote}
          lang={language}
        />
      )}

      {activeScreen === 'profile' && (
        <ProfileModal
          user={userProfile}
          onClose={() => setActiveScreen('home')}
          onUpdateUser={() => {}}
          lang={language}
          setLang={handleSetLanguage}
        />
      )}

      {/* Modals */}
      {showPostForm && (
        <PostDealForm
          onClose={() => setShowPostForm(false)}
          onSubmit={handlePostDeal}
          lang={language}
          userLocation={userLocation}
        />
      )}

    </div>
  );
}

export default HomeScreen;
