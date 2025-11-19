import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const configExtra =
  Constants.expoConfig?.extra ??
  ((Constants as unknown as { manifest?: { extra?: Record<string, unknown> } }).manifest?.extra ?? {});

const supabaseUrl = typeof configExtra?.supabaseUrl === 'string' ? configExtra.supabaseUrl : '';
const supabaseAnonKey =
  typeof configExtra?.supabaseAnonKey === 'string' ? configExtra.supabaseAnonKey : '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing Supabase credentials. Configure SUPABASE_URL/SUPABASE_ANON_KEY in app.config.ts (via .env.local or EAS secrets).',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
