import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase, signIn, signUp, signOut, resetPassword, getSession } from '@/services/supabase';
import { Profile, SubscriptionTier } from '@/types/database';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  fetchProfile: () => Promise<void>;
  updateSubscriptionTier: (tier: SubscriptionTier) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  initialize: async () => {
    try {
      set({ isLoading: true });

      // Get current session
      const { session, error } = await getSession();

      if (error) {
        console.error('Session error:', error);
        set({ isLoading: false, isInitialized: true });
        return;
      }

      if (session) {
        set({ user: session.user, session });
        await get().fetchProfile();
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        set({ user: session?.user ?? null, session });

        if (session?.user) {
          await get().fetchProfile();
        } else {
          set({ profile: null });
        }
      });

      set({ isLoading: false, isInitialized: true });
    } catch (error) {
      console.error('Init error:', error);
      set({ isLoading: false, isInitialized: true });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });

    const { data, error } = await signIn(email, password);

    if (error) {
      set({ isLoading: false, error: error.message });
      return { success: false, error: error.message };
    }

    set({
      user: data.user,
      session: data.session,
      isLoading: false
    });

    await get().fetchProfile();
    return { success: true };
  },

  register: async (email, password) => {
    set({ isLoading: true, error: null });

    const { data, error } = await signUp(email, password);

    if (error) {
      set({ isLoading: false, error: error.message });
      return { success: false, error: error.message };
    }

    // Create profile for new user
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email: data.user.email,
          display_name: null,
          preferred_currency: 'USD',
          subscription_tier: 'free',
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
      }

      set({
        user: data.user,
        session: data.session,
        isLoading: false
      });

      await get().fetchProfile();
    }

    return { success: true };
  },

  logout: async () => {
    set({ isLoading: true });
    await signOut();
    set({
      user: null,
      session: null,
      profile: null,
      isLoading: false
    });
  },

  forgotPassword: async (email) => {
    set({ isLoading: true, error: null });

    const { error } = await resetPassword(email);

    set({ isLoading: false });

    if (error) {
      set({ error: error.message });
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  fetchProfile: async () => {
    const { user } = get();
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Fetch profile error:', error);
      return;
    }

    set({ profile: data as Profile });
  },

  updateSubscriptionTier: (tier) => {
    const { profile } = get();
    if (profile) {
      set({ profile: { ...profile, subscription_tier: tier } });
    }
  },

  clearError: () => set({ error: null }),
}));
