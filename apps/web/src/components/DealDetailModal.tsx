import React, { useState, useRef, useEffect } from 'react';
import { Share2, MapPin, Navigation, ArrowBigUp, ArrowBigDown, Send, MessageCircle, ChevronLeft, Store, Clock, ShieldCheck, Trash2 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from './Toast';
import { Deal, Comment, Language } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getTranslation } from '../translations';
import { useAuth } from '../contexts/AuthContext';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface DealDetailModalProps {
  deal: Deal | null;
  onClose: () => void;
  onUpdateDeal: (deal: Deal) => void;
  onVote: (deal: Deal, direction: number) => void;
  lang: Language;
}

export const DealDetailModal: React.FC<DealDetailModalProps> = ({ deal, onClose, onUpdateDeal, onVote, lang }) => {
  const { user, session } = useAuth();
  const { isDark } = useTheme();
  const { showToast } = useToast();
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const t = (key: any) => getTranslation(lang, key);

  // Load comments from Supabase when deal changes
  useEffect(() => {
    setCommentText('');
    setComments([]);
    if (!deal) return;

    const loadComments = async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/comments?deal_id=eq.${deal.id}&order=created_at.asc&select=*,profiles(username,avatar_url)`,
          { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
        );
        if (res.ok) {
          const data = await res.json();
          setComments((data || []).map((c: any) => ({
            id: c.id,
            author: c.profiles?.username || 'Anonymous',
            text: c.content,
            date: c.created_at,
            userId: c.user_id,
          })));
        }
      } catch (err) { console.error('Failed to load comments:', err); }
    };
    loadComments();
  }, [deal?.id]);

  if (!deal) return null;

  const userVote = deal.userVote || 0;

  // Mock data for price comparison chart
  const data = [
    { name: t('avgPrice'), price: deal.originalPrice || 8.00 },
    { name: t('dealPrice'), price: deal.price },
  ];

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !user) return;

    const optimisticComment: Comment = {
      id: 'optimistic-' + Date.now(),
      text: commentText,
      author: 'You',
      date: new Date().toISOString(),
    };
    setComments(prev => [...prev, optimisticComment]);
    const typed = commentText;
    setCommentText('');

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${session?.access_token || SUPABASE_KEY}`,
        },
        body: JSON.stringify({ deal_id: deal.id, user_id: user.id, content: typed }),
      });
      if (res.ok) {
        const saved = await res.json();
        setComments(prev => prev.map(c =>
          c.id === optimisticComment.id
            ? { id: saved.id, author: user.email?.split('@')[0] || 'You', text: saved.content, date: saved.created_at }
            : c
        ));
      } else {
        setComments(prev => prev.filter(c => c.id !== optimisticComment.id));
      }
    } catch {
      setComments(prev => prev.filter(c => c.id !== optimisticComment.id));
    }

    // Scroll to bottom
    setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleShare = async () => {
    const shareText = `${deal.title} at ${deal.restaurantName} – only ${deal.currency}${deal.price.toFixed(2)}!`;
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share({ title: deal.title, text: shareText, dialogTitle: 'Share this deal' });
    } catch {
      // Fallback: copy to clipboard
      try { await navigator.clipboard.writeText(shareText); } catch {}
    }
  };

  const handleNavigate = () => {
    const { lat, lng, address } = deal.location;
    const query = address || `${lat},${lng}`;
    window.open(`https://maps.google.com/maps?q=${encodeURIComponent(query)}`, '_blank');
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!session?.access_token) return;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/comments?id=eq.${commentId}`, {
        method: 'DELETE',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (res.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId));
        showToast(t('commentDeleted'));
      }
    } catch (err) { console.error('Error deleting comment:', err); }
  };

  const handleDeleteDeal = async () => {
    if (!deal?.id || !session?.access_token) return;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/deals?id=eq.${deal.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ is_active: false }),
      });
      if (res.ok) {
        showToast(t('dealDeleted'));
        onClose();
      }
    } catch (err) { console.error('Error deleting deal:', err); }
  };

  return (
    <div className={`fixed inset-0 z-50 ${isDark ? 'bg-slate-900' : 'bg-white'} flex flex-col h-full w-full overflow-hidden animate-in slide-in-from-right duration-300`}>

        {/* Immersive Header Image */}
        <div className="relative h-80 w-full shrink-0" style={{ background: 'linear-gradient(135deg, #fed7aa, #fdba74)' }}>
          <img src={deal.imageUrl} alt={deal.title} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/30" />
          
          <button 
            onClick={onClose}
            className="absolute top-6 left-6 bg-white/20 backdrop-blur-xl border border-white/20 p-2.5 rounded-full text-white hover:bg-white/30 transition-all active:scale-95 shadow-sm"
          >
            <ChevronLeft size={24} strokeWidth={2.5} />
          </button>
          
          <div className="absolute bottom-14 left-6 flex gap-2">
            {deal.tags.map(tag => (
                <span key={tag} className="bg-black/40 backdrop-blur-md text-white border border-white/10 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md shadow-sm">
                    {tag}
                </span>
            ))}
          </div>
        </div>

        {/* Content Card - Overlaps Image */}
        <div className={`flex-1 -mt-10 ${isDark ? 'bg-slate-800' : 'bg-white'} rounded-t-[2.5rem] relative z-10 flex flex-col overflow-hidden shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.2)]`}>

            {/* Visual Handle */}
            <div className={`w-12 h-1.5 ${isDark ? 'bg-slate-700' : 'bg-gray-100'} rounded-full mx-auto mt-4 mb-2`} />

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 pb-32">
                
                {/* Header Section */}
                <div className="flex justify-between items-start mb-6 pt-2">
                    <div className="flex-1 pr-4">
                        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} leading-tight mb-2`}>{deal.title}</h1>
                        <div className={`flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'} font-medium`}>
                            <Store size={16} className="text-orange-500" />
                            <span className="text-sm">{deal.restaurantName}</span>
                            {deal.verified && <ShieldCheck size={14} className="text-blue-500 ml-1" />}
                            <span className="text-gray-300 mx-1">•</span>
                            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">{deal.cuisine}</span>
                        </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                         <div className="text-3xl font-black text-green-600 tracking-tight flex items-start">
                            <span className="text-lg font-bold mt-1 mr-0.5">{deal.currency}</span>
                            {deal.price.toFixed(2)}
                        </div>
                        {deal.originalPrice && (
                            <span className="text-gray-400 line-through text-xs font-medium bg-gray-50 px-1.5 py-0.5 rounded">
                                {deal.originalPrice.toFixed(2)}{deal.currency}
                            </span>
                        )}
                    </div>
                </div>

                {/* Stats Row */}
                <div className={`flex items-center justify-between py-5 border-y ${isDark ? 'border-slate-700' : 'border-gray-100'} mb-6`}>
                     {/* Vote Widget */}
                     <div className={`flex items-center gap-1 ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-100'} rounded-full p-1 border`}>
                        <button 
                            onClick={() => onVote(deal, 1)}
                            className={`p-2 rounded-full transition-all active:scale-90 ${userVote === 1 ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <ArrowBigUp size={20} fill={userVote === 1 ? "currentColor" : "none"} />
                        </button>
                        <span className={`font-bold text-lg min-w-[24px] text-center ${userVote === 1 ? 'text-orange-600' : userVote === -1 ? 'text-blue-600' : isDark ? 'text-white' : 'text-gray-900'}`}>
                            {deal.votes}
                        </span>
                        <button 
                             onClick={() => onVote(deal, -1)}
                             className={`p-2 rounded-full transition-all active:scale-90 ${userVote === -1 ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <ArrowBigDown size={20} fill={userVote === -1 ? "currentColor" : "none"} />
                        </button>
                     </div>

                     {/* Divider */}
                     <div className="h-8 w-[1px] bg-gray-100"></div>

                     {/* Distance/Location */}
                     <div className="flex flex-col items-end">
                        <div className={`flex items-center gap-1 ${isDark ? 'text-white' : 'text-gray-900'} font-bold text-sm`}>
                            <MapPin size={14} />
                            <span>{deal.distance || t('distance')}</span>
                        </div>
                        <span className="text-xs text-gray-400 truncate max-w-[120px]">{deal.location.address.split(',')[0]}</span>
                     </div>
                </div>

                {/* Description */}
                <div className="mb-8">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">{t('aboutDeal')}</h3>
                    <p className={`${isDark ? 'text-slate-300' : 'text-gray-700'} leading-relaxed text-[15px]`}>{deal.description}</p>
                    
                    <div className="mt-4 flex items-center gap-2 bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm font-medium w-fit">
                        <Clock size={16} />
                        <span>{t('validUntil')} {new Date(deal.validUntil).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                </div>

                {/* Price Visualization - Clean */}
                <div className="mb-8">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">{t('priceCheck')}</h3>
                    <div className="h-16 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={data} margin={{ top: 0, right: 40, left: -20, bottom: 0 }} barGap={2}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 10, fill: '#9ca3af', fontWeight: 600}} axisLine={false} tickLine={false} />
                                <Tooltip 
                                    cursor={{fill: 'transparent'}} 
                                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} 
                                />
                                <Bar dataKey="price" radius={[0, 4, 4, 0]} barSize={12}>
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 1 ? '#16a34a' : '#e5e7eb'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Comments Section */}
                <div className="mb-6">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                        {t('communitySays')} <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px]">{comments.length}</span>
                    </h3>
                    
                    <div className="space-y-4 mb-6">
                        {comments.length === 0 ? (
                            <div className="text-center py-6 bg-gray-50/50 rounded-xl border border-dashed border-gray-100">
                                <MessageCircle className="mx-auto text-gray-300 mb-2" size={24} />
                                <p className="text-sm text-gray-500">{t('noComments')}</p>
                            </div>
                        ) : (
                            comments.map(comment => (
                                <div key={comment.id} className="group">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{comment.author}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-gray-400">
                                                {new Date(comment.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                            {comment.userId && comment.userId === user?.id && (
                                                <button onClick={() => handleDeleteComment(comment.id)} className="text-[10px] text-red-400 hover:text-red-600 font-semibold">
                                                    {t('deleteComment')}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <p className={`${isDark ? 'text-slate-400' : 'text-gray-600'} text-sm leading-relaxed`}>{comment.text}</p>
                                    <div className={`h-[1px] ${isDark ? 'bg-slate-700' : 'bg-gray-50'} mt-3 group-last:hidden`} />
                                </div>
                            ))
                        )}
                        <div ref={commentsEndRef} />
                    </div>

                    <form onSubmit={handlePostComment} className="flex gap-2">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder={t('addComment')}
                                className={`w-full ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500 focus:bg-slate-600' : 'bg-gray-50 border-gray-100 focus:bg-white'} border rounded-full pl-4 pr-10 py-2.5 text-sm focus:border-black focus:outline-none transition-colors`}
                            />
                        </div>
                        <button 
                            type="submit"
                            disabled={!commentText.trim()}
                            className="bg-black text-white p-2.5 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors shadow-md active:scale-95"
                        >
                            <Send size={16} />
                        </button>
                    </form>
                </div>
                {/* Delete Own Deal */}
                {deal.userId && deal.userId === user?.id && (
                    <div className={`mt-8 pt-4 border-t ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
                        <button onClick={() => setShowDeleteConfirm(true)} className="text-red-500 text-sm font-semibold hover:text-red-600 transition-colors">
                            {t('deleteDeal')}
                        </button>
                    </div>
                )}
            </div>
        </div>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
            <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-6">
                <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-6 max-w-sm w-full shadow-xl`}>
                    <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>{t('deleteDeal')}</p>
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'} mb-6`}>{t('confirmDeleteDeal')}</p>
                    <div className="flex gap-3">
                        <button onClick={() => setShowDeleteConfirm(false)} className={`flex-1 py-2.5 rounded-xl border ${isDark ? 'border-slate-600 text-slate-300' : 'border-gray-200 text-gray-700'} font-semibold`}>{t('deleteCancel')}</button>
                        <button onClick={handleDeleteDeal} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors">{t('deleteConfirm')}</button>
                    </div>
                </div>
            </div>
        )}

        {/* Floating Action Footer */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-30">
            <div className="flex gap-3 bg-white/90 backdrop-blur-md p-1.5 rounded-[1.25rem] shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/20">
                <button onClick={handleShare} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors text-sm active:scale-95">
                    <Share2 size={18} />
                    {t('share')}
                </button>
                <button onClick={handleNavigate} className="flex-[1.5] bg-black text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors shadow-lg shadow-gray-900/10 text-sm active:scale-95">
                    <Navigation size={18} />
                    {t('navigate')}
                </button>
            </div>
        </div>
    </div>
  );
};