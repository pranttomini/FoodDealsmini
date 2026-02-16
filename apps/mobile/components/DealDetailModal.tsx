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
} from 'react-native';
import { Text, View } from './Themed';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

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
  const { user, profile } = useAuth();
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

      // Optimistic UI update
      if (isRemovingVote) {
        setUserVote(null);
        if (voteType === 'up') setLocalUpvotes(prev => prev - 1);
        else setLocalDownvotes(prev => prev - 1);
      } else if (isChangingVote) {
        setUserVote(voteType);
        if (voteType === 'up') {
          setLocalUpvotes(prev => prev + 1);
          setLocalDownvotes(prev => prev - 1);
        } else {
          setLocalDownvotes(prev => prev + 1);
          setLocalUpvotes(prev => prev - 1);
        }
      } else {
        setUserVote(voteType);
        if (voteType === 'up') setLocalUpvotes(prev => prev + 1);
        else setLocalDownvotes(prev => prev + 1);
      }

      if (isRemovingVote) {
        // Delete vote
        const { error } = await supabase
          .from('votes')
          .delete()
          .eq('deal_id', deal.id)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Upsert vote
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
      // Revert optimistic update
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
            const { error } = await supabase
              .from('deals')
              .update({ is_active: false })
              .eq('id', deal.id);

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

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView style={styles.scrollView}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            {isOwner && (
              <TouchableOpacity onPress={handleDeleteDeal} style={styles.deleteButton}>
                <Text style={styles.deleteButtonText}>🗑️</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Image */}
          {deal.image_url && (
            <Image source={{ uri: deal.image_url }} style={styles.image} resizeMode="cover" />
          )}

          {/* Content */}
          <View style={styles.content}>
            {/* Title & Discount */}
            <View style={styles.titleRow}>
              <Text style={styles.title}>{deal.title}</Text>
              {deal.discount_percentage && (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>-{deal.discount_percentage}%</Text>
                </View>
              )}
            </View>

            {/* Restaurant */}
            <Text style={styles.restaurant}>{deal.restaurant_name}</Text>
            {deal.address && <Text style={styles.address}>📍 {deal.address}</Text>}

            {/* Description */}
            <Text style={styles.description}>{deal.description}</Text>

            {/* Price */}
            <View style={styles.priceRow}>
              <Text style={styles.price}>€{deal.deal_price}</Text>
              {deal.original_price && (
                <Text style={styles.originalPrice}>€{deal.original_price}</Text>
              )}
            </View>

            {/* Tags */}
            <View style={styles.tags}>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{deal.cuisine_type}</Text>
              </View>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{deal.deal_type}</Text>
              </View>
            </View>

            {/* Voting */}
            <View style={styles.votingSection}>
              <TouchableOpacity
                style={[styles.voteButton, userVote === 'up' && styles.voteButtonActive]}
                onPress={() => handleVote('up')}
              >
                <Text style={styles.voteButtonText}>👍 {localUpvotes}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.voteButton, userVote === 'down' && styles.voteButtonActive]}
                onPress={() => handleVote('down')}
              >
                <Text style={styles.voteButtonText}>👎 {localDownvotes}</Text>
              </TouchableOpacity>
              <Text style={styles.voteScore}>Score: {localUpvotes - localDownvotes}</Text>
            </View>

            {/* Comments Section */}
            <View style={styles.commentsSection}>
              <Text style={styles.sectionTitle}>Comments ({comments.length})</Text>

              {/* Add Comment */}
              {user ? (
                <View style={styles.addCommentContainer}>
                  <TextInput
                    style={styles.commentInput}
                    value={newComment}
                    onChangeText={setNewComment}
                    placeholder="Add a comment..."
                    placeholderTextColor="#999"
                    multiline
                    maxLength={1000}
                  />
                  <TouchableOpacity
                    style={[styles.commentButton, loading && styles.commentButtonDisabled]}
                    onPress={handleAddComment}
                    disabled={loading || !newComment.trim()}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.commentButtonText}>Post</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.loginPrompt}>Log in to comment</Text>
              )}

              {/* Comments List */}
              {comments.map((comment) => (
                <View key={comment.id} style={styles.comment}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentAuthor}>
                      {comment.profiles?.username || 'Anonymous'}
                    </Text>
                    <Text style={styles.commentDate}>
                      {new Date(comment.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={styles.commentText}>{comment.content}</Text>
                  {user?.id === comment.user_id && (
                    <TouchableOpacity
                      onPress={() => handleDeleteComment(comment.id)}
                      style={styles.deleteCommentButton}
                    >
                      <Text style={styles.deleteCommentText}>Delete</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 50,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239,68,68,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 20,
  },
  image: {
    width: '100%',
    height: 300,
  },
  content: {
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 12,
  },
  discountBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  discountText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  restaurant: {
    fontSize: 18,
    color: '#666',
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: '#999',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444',
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#10b981',
  },
  originalPrice: {
    fontSize: 18,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  tags: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  tag: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 14,
    color: '#666',
  },
  votingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 32,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
  },
  voteButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  voteButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  voteButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  voteScore: {
    fontSize: 16,
    color: '#666',
    marginLeft: 'auto',
  },
  commentsSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  addCommentContainer: {
    marginBottom: 20,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  commentButton: {
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  commentButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  commentButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loginPrompt: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },
  comment: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  commentDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  commentText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  deleteCommentButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  deleteCommentText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '600',
  },
});
