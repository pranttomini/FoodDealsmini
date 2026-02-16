import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const isBrowserRuntime = typeof window !== 'undefined';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: isBrowserRuntime ? AsyncStorage : undefined,
    autoRefreshToken: isBrowserRuntime,
    persistSession: isBrowserRuntime,
    detectSessionInUrl: isBrowserRuntime,
  },
});
