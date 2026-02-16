import { useState, useEffect, useRef, useCallback } from 'react';
import { Tables } from '../types/supabase';

type Deal = Tables<'deals'>;
type DealWithProfile = Deal & { profiles?: { username: string; avatar_url: string | null } | null };

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const useDeals = () => {
  const [deals, setDeals] = useState<DealWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchDeals = useCallback(async () => {
    try {
      const now = new Date().toISOString();
      const url = `${SUPABASE_URL}/rest/v1/deals?select=*&is_active=eq.true&or=(expires_at.is.null,expires_at.gte.${now})&order=created_at.desc`;

      const response = await fetch(url, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      });

      const dealsData = await response.json();

      if (!mountedRef.current) return;

      if (!response.ok) {
        setError(`HTTP ${response.status}: ${JSON.stringify(dealsData)}`);
        return;
      }

      // Fetch profiles
      const userIds = [...new Set((dealsData || []).map((d: any) => d.user_id).filter(Boolean))];
      let profilesMap: Record<string, { username: string; avatar_url: string | null }> = {};

      if (userIds.length > 0) {
        const profilesUrl = `${SUPABASE_URL}/rest/v1/profiles?select=id,username,avatar_url&id=in.(${userIds.join(',')})`;
        const profRes = await fetch(profilesUrl, {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
        });
        const profilesData = await profRes.json();
        if (profilesData) {
          profilesData.forEach((p: any) => {
            profilesMap[p.id] = { username: p.username, avatar_url: p.avatar_url };
          });
        }
      }

      const dealsWithProfiles = (dealsData || []).map((deal: any) => ({
        ...deal,
        profiles: deal.user_id ? profilesMap[deal.user_id] || null : null,
      }));

      if (mountedRef.current) {
        setDeals(dealsWithProfiles);
      }
    } catch (err: any) {
      console.error('[useDeals] fetch exception:', err);
      if (mountedRef.current) {
        setError(err.message || 'Failed to fetch deals');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchDeals();

    // Poll every 30s so new deals appear without manual refresh
    const pollInterval = setInterval(() => {
      if (mountedRef.current) fetchDeals();
    }, 30 * 1000);

    return () => {
      mountedRef.current = false;
      clearInterval(pollInterval);
    };
  }, [fetchDeals]);

  return { deals, loading, error, refetch: fetchDeals };
};
