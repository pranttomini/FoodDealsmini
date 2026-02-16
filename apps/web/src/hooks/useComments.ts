import { useState, useEffect } from 'react';
import { commentsApi } from '../services/api';
import { Tables } from '../types/supabase';

type Comment = Tables<'comments'>;
type CommentWithProfile = Comment & { profiles: { username: string; avatar_url: string | null } | null };

export const useComments = (dealId: string | null) => {
  const [comments, setComments] = useState<CommentWithProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = async () => {
    if (!dealId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await commentsApi.getByDeal(dealId);
      setComments(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch comments');
      console.error('Error fetching comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const addComment = async (content: string, userId: string) => {
    if (!dealId) return;

    try {
      const newComment = await commentsApi.create({
        deal_id: dealId,
        user_id: userId,
        content,
      });
      setComments((prev) => [...prev, newComment]);
      return newComment;
    } catch (err: any) {
      console.error('Error adding comment:', err);
      throw err;
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      await commentsApi.delete(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err: any) {
      console.error('Error deleting comment:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchComments();

    if (!dealId) return;

    // Subscribe to real-time updates
    const subscription = commentsApi.subscribeToDeals(dealId, (payload) => {
      if (payload.eventType === 'INSERT') {
        fetchComments(); // Refetch to get profile data
      } else if (payload.eventType === 'DELETE') {
        setComments((prev) => prev.filter((c) => c.id !== payload.old.id));
      } else if (payload.eventType === 'UPDATE') {
        setComments((prev) =>
          prev.map((c) => (c.id === payload.new.id ? { ...c, ...payload.new } : c))
        );
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [dealId]);

  return { comments, loading, error, addComment, deleteComment, refetch: fetchComments };
};
