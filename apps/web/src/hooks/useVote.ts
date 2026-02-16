import { useState, useEffect } from 'react';
import { votesApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export const useVote = (dealId: string | null) => {
  const { user } = useAuth();
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!dealId || !user) {
      setUserVote(null);
      return;
    }

    const fetchUserVote = async () => {
      try {
        const vote = await votesApi.getUserVote(dealId, user.id);
        setUserVote(vote?.vote_type as 'up' | 'down' | null || null);
      } catch (err) {
        console.error('Error fetching user vote:', err);
      }
    };

    fetchUserVote();
  }, [dealId, user]);

  const vote = async (voteType: 'up' | 'down') => {
    if (!dealId || !user) return;

    try {
      setLoading(true);
      const result = await votesApi.vote(dealId, user.id, voteType);
      setUserVote(result?.vote_type as 'up' | 'down' | null || null);
    } catch (err) {
      console.error('Error voting:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const unvote = async () => {
    if (!dealId || !user) return;

    try {
      setLoading(true);
      await votesApi.unvote(dealId, user.id);
      setUserVote(null);
    } catch (err) {
      console.error('Error unvoting:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { userVote, vote, unvote, loading };
};
