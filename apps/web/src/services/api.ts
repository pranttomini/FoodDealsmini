import { supabase } from './supabaseClient';
import { Tables, TablesInsert, TablesUpdate } from '../types/supabase';

// Type aliases for better readability
type Deal = Tables<'deals'>;
type DealInsert = TablesInsert<'deals'>;
type DealUpdate = TablesUpdate<'deals'>;
type Profile = Tables<'profiles'>;
type Comment = Tables<'comments'>;
type CommentInsert = TablesInsert<'comments'>;
type Vote = Tables<'votes'>;
type VoteInsert = TablesInsert<'votes'>;

// ==================== DEALS API ====================

export const dealsApi = {
  /**
   * Get all active deals with optional filters
   */
  async getAll(filters?: {
    maxPrice?: number;
    maxDistance?: number;
    cuisineTypes?: string[];
    dealTypes?: string[];
    userLocation?: { lat: number; lng: number };
  }) {
    console.log('[dealsApi.getAll] START');
    try {
      let query = supabase
        .from('deals')
        .select('*, profiles(username, avatar_url)')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.maxPrice) {
        query = query.lte('deal_price', filters.maxPrice);
      }

      if (filters?.cuisineTypes && filters.cuisineTypes.length > 0) {
        query = query.in('cuisine_type', filters.cuisineTypes);
      }

      if (filters?.dealTypes && filters.dealTypes.length > 0) {
        query = query.in('deal_type', filters.dealTypes);
      }

      console.log('[dealsApi.getAll] executing query...');
      const { data, error } = await query;
      console.log('[dealsApi.getAll] query done, data:', data?.length, 'error:', error);
      if (error) throw error;

      return data as (Deal & { profiles: { username: string; avatar_url: string | null } })[];
    } catch (err) {
      console.error('[dealsApi.getAll] CAUGHT ERROR:', err);
      throw err;
    }
  },

  /**
   * Get deals near a location using PostGIS
   */
  async getNearby(lat: number, lon: number, radiusMeters = 5000) {
    const { data, error } = await supabase.rpc('get_deals_near_location', {
      lat,
      lon,
      radius_meters: radiusMeters,
    });

    if (error) throw error;
    return data;
  },

  /**
   * Get a single deal by ID
   */
  async getById(id: string) {
    const { data, error } = await supabase
      .from('deals')
      .select('*, profiles(username, avatar_url, level, xp_points)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Deal & { profiles: { username: string; avatar_url: string | null; level: number | null; xp_points: number | null } };
  },

  /**
   * Create a new deal
   */
  async create(deal: DealInsert) {
    const { data, error } = await supabase
      .from('deals')
      .insert(deal)
      .select()
      .single();

    if (error) throw error;
    return data as Deal;
  },

  /**
   * Update a deal
   */
  async update(id: string, updates: DealUpdate) {
    const { data, error } = await supabase
      .from('deals')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Deal;
  },

  /**
   * Delete a deal (soft delete by setting is_active to false)
   */
  async delete(id: string) {
    const { error } = await supabase
      .from('deals')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Subscribe to real-time deal updates
   */
  subscribeToAll(callback: (payload: any) => void) {
    const channelName = `deals-rt-${Date.now()}`;
    console.log('[dealsApi.subscribeToAll] subscribing on channel:', channelName);
    return supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deals' }, callback)
      .subscribe();
  },
};

// ==================== PROFILE API ====================

export const profileApi = {
  /**
   * Get profile by user ID
   */
  async get(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data as Profile;
  },

  /**
   * Update profile
   */
  async update(userId: string, updates: TablesUpdate<'profiles'>) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data as Profile;
  },

  /**
   * Get user's badges
   */
  async getBadges(userId: string) {
    const { data, error } = await supabase
      .from('user_badges')
      .select('*, badges(*)')
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * Get user's deals
   */
  async getDeals(userId: string) {
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Deal[];
  },
};

// ==================== VOTES API ====================

export const votesApi = {
  /**
   * Get user's vote for a deal
   */
  async getUserVote(dealId: string, userId: string) {
    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .eq('deal_id', dealId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data as Vote | null;
  },

  /**
   * Cast or update a vote
   */
  async vote(dealId: string, userId: string, voteType: 'up' | 'down') {
    // Check if user already voted
    const existingVote = await this.getUserVote(dealId, userId);

    if (existingVote) {
      // Update existing vote
      if (existingVote.vote_type === voteType) {
        // Remove vote if clicking same direction
        const { error } = await supabase
          .from('votes')
          .delete()
          .eq('id', existingVote.id);

        if (error) throw error;
        return null;
      } else {
        // Change vote direction
        const { data, error } = await supabase
          .from('votes')
          .update({ vote_type: voteType })
          .eq('id', existingVote.id)
          .select()
          .single();

        if (error) throw error;
        return data as Vote;
      }
    } else {
      // Create new vote
      const { data, error } = await supabase
        .from('votes')
        .insert({ deal_id: dealId, user_id: userId, vote_type: voteType })
        .select()
        .single();

      if (error) throw error;
      return data as Vote;
    }
  },

  /**
   * Remove a vote
   */
  async unvote(dealId: string, userId: string) {
    const { error } = await supabase
      .from('votes')
      .delete()
      .eq('deal_id', dealId)
      .eq('user_id', userId);

    if (error) throw error;
  },
};

// ==================== COMMENTS API ====================

export const commentsApi = {
  /**
   * Get comments for a deal
   */
  async getByDeal(dealId: string) {
    const { data, error } = await supabase
      .from('comments')
      .select('*, profiles(username, avatar_url)')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as (Comment & { profiles: { username: string; avatar_url: string | null } | null })[];
  },

  /**
   * Add a comment
   */
  async create(comment: CommentInsert) {
    const { data, error } = await supabase
      .from('comments')
      .insert(comment)
      .select('*, profiles(username, avatar_url)')
      .single();

    if (error) throw error;
    return data as Comment & { profiles: { username: string; avatar_url: string | null } };
  },

  /**
   * Update a comment
   */
  async update(commentId: string, content: string) {
    const { data, error } = await supabase
      .from('comments')
      .update({ content })
      .eq('id', commentId)
      .select()
      .single();

    if (error) throw error;
    return data as Comment;
  },

  /**
   * Delete a comment
   */
  async delete(commentId: string) {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) throw error;
  },

  /**
   * Subscribe to comment updates for a deal
   */
  subscribeToDeals(dealId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`comments-${dealId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments', filter: `deal_id=eq.${dealId}` },
        callback
      )
      .subscribe();
  },
};

// ==================== FOOD ALERTS API ====================

export const foodAlertsApi = {
  /**
   * Get user's food alert settings
   */
  async get(userId: string) {
    const { data, error } = await supabase
      .from('food_alerts')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Create or update food alert settings
   */
  async upsert(alert: TablesInsert<'food_alerts'>) {
    const { data, error } = await supabase
      .from('food_alerts')
      .upsert(alert)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete food alert settings
   */
  async delete(userId: string) {
    const { error } = await supabase
      .from('food_alerts')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
  },
};
