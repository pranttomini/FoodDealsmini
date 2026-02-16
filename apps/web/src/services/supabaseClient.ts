import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Helper functions for common operations
export const supabaseHelpers = {
  // Example: Fetch all deals
  async getDeals() {
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Example: Insert a new deal
  async createDeal(deal: Database['public']['Tables']['deals']['Insert']) {
    const { data, error } = await supabase
      .from('deals')
      .insert(deal)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Example: Update a deal
  async updateDeal(id: string, updates: Database['public']['Tables']['deals']['Update']) {
    const { data, error } = await supabase
      .from('deals')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Example: Delete a deal
  async deleteDeal(id: string) {
    const { error } = await supabase
      .from('deals')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Example: Subscribe to real-time changes
  subscribeToDeals(callback: (payload: any) => void) {
    return supabase
      .channel('deals-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deals' }, callback)
      .subscribe();
  }
};
