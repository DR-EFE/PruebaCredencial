import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const fallbackConfig = Constants.expoConfig?.extra;
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  (typeof fallbackConfig?.supabaseUrl === 'string' ? fallbackConfig?.supabaseUrl : '') ||
  '';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  (typeof fallbackConfig?.supabaseAnonKey === 'string' ? fallbackConfig?.supabaseAnonKey : '') ||
  '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase credentials. Please configure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
