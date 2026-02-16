import React, { useState, useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { theme } from '../constants/theme';
import { Pill, PrimaryButton, SurfaceCard } from './ui/MobilePrimitives';

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    username: string;
  };
}

interface Deal {
  id: string;
  title: string;
  description: string;
  restaurant_name: string;
  address: string;
  deal_price: number;
  original_price: number;
  discount_percentage: number;
  image_url: string | null;
  cuisine_type: string;
  deal_type: string;
  upvotes: number;
  downvotes: number;
  vote_score: number;
  user_id: string;
  created_at: string;
}

interface DealDetailModalProps {
  visible: boolean;
  deal: Deal | null;
  onClose: () => void;
  onDealUpdated: () => void;
}

export function DealDetailModal({ visible, deal, onClose, onDealUpdated }: DealDetailModalProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [localUpvotes, setLocalUpvotes] = useState(0);
  const [localDownvotes, setLocalDownvotes] = useState(0);

  useEffect(() => {
    if (visible && deal) {
      fetchComments();
      fetchUserVote();
      setLocalUpvotes(deal.upvotes);
      setLocalDownvotes(deal.downvotes);
    }
  }, [visible, deal]);

  const fetchComments = async () => {
    if (!deal) return;

    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*, profiles(username)')
        .eq('deal_id', deal.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const fetchUserVote = async () => {
    if (!user || !deal) return;

    try {
      const { data, error } = await supabase
        .from('votes')
        .select('vote_type')
        .eq('deal_id', deal.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setUserVote(data?.vote_type || null);
    } catch (error) {
      console.error('Error fetching user vote:', error);
    }
  };

  const handleVote = async (voteType: 'up' | 'down') => {
    if (!user || !deal) {
      Alert.alert('Login required', 'Please log in to vote');
      return;
    }

    try {
      const isChangingVote = userVote && userVote !== voteType;
      const isRemovingVote = userVote === voteType;

      if (isRemovingVote) {
        setUserVote(null);
        if (voteType === 'up') setLocalUpvotes((prev) => prev - 1);
        else setLocalDownvotes((prev) => prev - 1);
      } else if (isChangingVote) {
        setUserVote(voteType);
        if (voteType === 'up') {
          setLocalUpvotes((prev) => prev + 1);
          setLocalDownvotes((prev) => prev - 1);
        } else {
          setLocalDownvotes((prev) => prev + 1);
          setLocalUpvotes((prev) => prev - 1);
        }
      } else {
        setUserVote(voteType);
        if (voteType === 'up') setLocalUpvotes((prev) => prev + 1);
        else setLocalDownvotes((prev) => prev + 1);
      }

      if (isRemovingVote) {
        const { error } = await supabase.from('votes').delete().eq('deal_id', deal.id).eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('votes').upsert(
          {
            deal_id: deal.id,
            user_id: user.id,
            vote_type: voteType,
          },
          { onConflict: 'deal_id,user_id' }
        );

        if (error) throw error;
      }

      onDealUpdated();
    } catch (error) {
      console.error('Error voting:', error);
      fetchUserVote();
      setLocalUpvotes(deal.upvotes);
      setLocalDownvotes(deal.downvotes);
      Alert.alert('Error', 'Failed to record vote');
    }
  };

  const handleAddComment = async () => {
    if (!user || !deal || !newComment.trim()) return;

    if (newComment.length > 1000) {
      Alert.alert('Comment too long', 'Maximum 1000 characters');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('comments').insert({
        deal_id: deal.id,
        user_id: user.id,
        content: newComment.trim(),
      });

      if (error) throw error;

      setNewComment('');
      await fetchComments();
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    Alert.alert('Delete Comment', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('comments').delete().eq('id', commentId);
            if (error) throw error;
            await fetchComments();
          } catch (error) {
            console.error('Error deleting comment:', error);
            Alert.alert('Error', 'Failed to delete comment');
          }
        },
      },
    ]);
  };

  const handleDeleteDeal = async () => {
    if (!deal || !user || deal.user_id !== user.id) return;

    Alert.alert('Delete Deal', 'Are you sure you want to delete this deal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('deals').update({ is_active: false }).eq('id', deal.id);
            if (error) throw error;

            Alert.alert('Success', 'Deal deleted successfully');
            onDealUpdated();
            onClose();
          } catch (error) {
            console.error('Error deleting deal:', error);
            Alert.alert('Error', 'Failed to delete deal');
          }
        },
      },
    ]);
  };

  if (!deal) return null;

  const isOwner = user?.id === deal.user_id;
  const score = localUpvotes - localDownvotes;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={onClose} style={styles.iconButton}>
              <Text style={styles.iconText}>✕</Text>
            </TouchableOpacity>
            {isOwner ? (
              <TouchableOpacity onPress={handleDeleteDeal} style={[styles.iconButton, styles.deleteIconButton]}>
                <Text style={styles.iconText}>🗑️</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.placeholderIcon} />
            )}
          </View>

          {deal.image_url ? (
            <Image source={{ uri: deal.image_url }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.imageFallback}>
              <Text style={styles.imageFallbackText}>Fresh deal</Text>
            </View>
          )}

          <SurfaceCard style={styles.heroCard}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{deal.title}</Text>
              {deal.discount_percentage ? (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>-{deal.discount_percentage}%</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.restaurant}>{deal.restaurant_name}</Text>
            {deal.address ? <Text style={styles.address}>📍 {deal.address}</Text> : null}

            <View style={styles.priceRow}>
              <Text style={styles.price}>€{Number(deal.deal_price).toFixed(2)}</Text>
              {deal.original_price ? (
                <Text style={styles.originalPrice}>€{Number(deal.original_price).toFixed(2)}</Text>
              ) : null}
            </View>

            {deal.description ? <Text style={styles.description}>{deal.description}</Text> : null}

            <View style={styles.tagRow}>
              <Pill label={deal.cuisine_type || 'food'} />
              <Pill label={deal.deal_type || 'deal'} />
            </View>
          </SurfaceCard>

          <SurfaceCard style={styles.voteCard}>
            <View style={styles.voteTopRow}>
              <Text style={styles.sectionTitle}>Community Pulse</Text>
              <Text style={styles.scoreText}>Score {score >= 0 ? '+' : ''}{score}</Text>
            </View>
            <View style={styles.voteButtonsRow}>
              <PrimaryButton
                title={`👍 Upvote ${localUpvotes}`}
                onPress={() => handleVote('up')}
                secondary={userVote !== 'up'}
              />
              <PrimaryButton
                title={`👎 Downvote ${localDownvotes}`}
                onPress={() => handleVote('down')}
                secondary={userVote !== 'down'}
              />
            </View>
          </SurfaceCard>

          <SurfaceCard>
            <Text style={styles.sectionTitle}>Comments ({comments.length})</Text>
            {user ? (
              <View style={styles.addCommentWrap}>
                <TextInput
                  style={styles.commentInput}
                  value={newComment}
                  onChangeText={setNewComment}
                  placeholder="Share your tip, timing, or update..."
                  placeholderTextColor={theme.colors.textSoft}
                  multiline
                  maxLength={1000}
                />
                <PrimaryButton
                  title={loading ? 'Posting...' : 'Post Comment'}
                  onPress={handleAddComment}
                  disabled={loading || !newComment.trim()}
                  rightMeta={`${newComment.length}/1000`}
                />
              </View>
            ) : (
              <Text style={styles.loginPrompt}>Log in to join the discussion.</Text>
            )}

            <View style={styles.commentList}>
              {comments.map((comment) => (
                <View key={comment.id} style={styles.commentCard}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentAuthor}>{comment.profiles?.username || 'Anonymous'}</Text>
                    <Text style={styles.commentDate}>{new Date(comment.created_at).toLocaleDateString()}</Text>
                  </View>
                  <Text style={styles.commentText}>{comment.content}</Text>
                  {user?.id === comment.user_id ? (
                    <TouchableOpacity onPress={() => handleDeleteComment(comment.id)}>
                      <Text style={styles.deleteCommentText}>Delete</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}
            </View>
          </SurfaceCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.md,
    paddingBottom: 42,
    gap: theme.spacing.md,
  },
  headerRow: {
    marginTop: Platform.OS === 'ios' ? 34 : 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
  },
  deleteIconButton: {
    backgroundColor: theme.colors.danger,
  },
  placeholderIcon: {
    width: 40,
  },
  iconText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
  image: {
    height: 260,
    width: '100%',
    borderRadius: theme.radius.lg,
  },
  imageFallback: {
    height: 170,
    borderRadius: theme.radius.lg,
    backgroundColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageFallbackText: {
    color: '#9a3412',
    fontWeight: '800',
    fontSize: 20,
  },
  heroCard: {
    gap: 10,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  title: {
    flex: 1,
    color: theme.colors.text,
    fontSize: theme.type.h2,
    lineHeight: 28,
    fontWeight: '900',
  },
  discountBadge: {
    backgroundColor: theme.colors.danger,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  discountText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
  restaurant: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '700',
  },
  address: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  price: {
    color: theme.colors.success,
    fontSize: 36,
    fontWeight: '900',
  },
  originalPrice: {
    color: theme.colors.textSoft,
    fontSize: 16,
    textDecorationLine: 'line-through',
    fontWeight: '600',
  },
  description: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 22,
  },
  tagRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  voteCard: {
    gap: 12,
  },
  voteTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.text,
  },
  scoreText: {
    fontSize: 15,
    color: '#92400e',
    fontWeight: '800',
  },
  voteButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  addCommentWrap: {
    marginTop: 12,
    gap: 10,
  },
  commentInput: {
    minHeight: 90,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
    fontSize: 15,
    color: theme.colors.text,
  },
  loginPrompt: {
    marginTop: 10,
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  commentList: {
    marginTop: 12,
    gap: 10,
  },
  commentCard: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: 12,
    gap: 8,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentAuthor: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
  },
  commentDate: {
    color: theme.colors.textSoft,
    fontSize: 12,
  },
  commentText: {
    color: '#374151',
    fontSize: 14,
    lineHeight: 20,
  },
  deleteCommentText: {
    color: theme.colors.danger,
    fontSize: 12,
    fontWeight: '700',
  },
});
