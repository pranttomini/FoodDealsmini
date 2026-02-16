import { useState, useEffect } from 'react';
import { dealsApi } from '../services/api';
import { Tables } from '../types/supabase';

type Deal = Tables<'deals'>;
type DealWithProfile = Deal & {
  profiles: { username: string; avatar_url: string | null; level: number | null; xp_points: number | null };
};

export const useDealDetail = (dealId: string | null) => {
  const [deal, setDeal] = useState<DealWithProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dealId) {
      setDeal(null);
      return;
    }

    const fetchDeal = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await dealsApi.getById(dealId);
        setDeal(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch deal');
        console.error('Error fetching deal:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDeal();
  }, [dealId]);

  return { deal, loading, error };
};
