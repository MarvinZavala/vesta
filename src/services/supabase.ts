import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export async function signUp(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { data, error };
  } catch (e: any) {
    const msg = e?.message?.includes('JSON')
      ? 'Service temporarily unavailable. Please try again in a moment.'
      : (e?.message || 'An unexpected error occurred');
    return { data: { user: null, session: null }, error: { message: msg, status: 503 } as any };
  }
}

export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  } catch (e: any) {
    // Supabase outage returns HTML instead of JSON → parse error
    const msg = e?.message?.includes('JSON')
      ? 'Service temporarily unavailable. Please try again in a moment.'
      : (e?.message || 'An unexpected error occurred');
    return { data: { user: null, session: null }, error: { message: msg, status: 503 } as any };
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function resetPassword(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email);
  return { data, error };
}

export async function getSession() {
  try {
    const { data, error } = await supabase.auth.getSession();
    return { session: data.session, error };
  } catch (e: any) {
    const msg = e?.message?.includes('JSON')
      ? 'Service temporarily unavailable. Please try again in a moment.'
      : (e?.message || 'An unexpected error occurred');
    return { session: null, error: { message: msg, status: 503 } as any };
  }
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
}
