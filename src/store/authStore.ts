import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase, signIn, signUp, signOut, resetPassword, getSession } from '@/services/supabase';
import { Profile, SubscriptionTier } from '@/types/database';
import { identifyUser, logoutRevenueCat, getRecommendedTier, isRevenueCatConfigured, isRevenueCatReady } from '@/services/revenuecat';


interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isInitialized: boolean;
  isAuthenticating: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  fetchProfile: () => Promise<void>;
  updateSubscriptionTier: (tier: SubscriptionTier, persistToDatabase?: boolean) => Promise<void>;
  syncSubscriptionFromRevenueCat: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  isLoading: false,
  isInitialized: false,
  isAuthenticating: false,
  error: null,

  initialize: async () => {
    // Guard against double-init (React 19 strict mode calls effects twice)
    if (get().isInitialized || get().isLoading) return;

    try {
      set({ isLoading: true });
      const { session, error } = await getSession();

      if (error) {
        console.error('Session error:', error);
        await supabase.auth.signOut().catch(() => {});
        set({ isLoading: false, isInitialized: true });
        return;
      }

      if (session) {
        set({ user: session.user, session });
        try {
          await get().fetchProfile();
          if (isRevenueCatReady()) {
            const customerInfo = await identifyUser(session.user.id);
            // Only sync if user was successfully identified — prevents false downgrade
            if (customerInfo) {
              await get().syncSubscriptionFromRevenueCat();
            }
          }
        } catch (e) {
          console.error('Profile/RC sync error:', e);
        }
      }

      supabase.auth.onAuthStateChange(async (event, newSession) => {
        // Block during active auth operations (login/register)
        if (get().isAuthenticating) return;

        // Skip redundant updates - prevents double navigation crash
        const currentToken = get().session?.access_token;
        const newToken = newSession?.access_token;
        if (currentToken && newToken && currentToken === newToken) return;

        set({ user: newSession?.user ?? null, session: newSession });
        if (newSession?.user) {
          try {
            await get().fetchProfile();
            if (isRevenueCatReady()) {
              const customerInfo = await identifyUser(newSession.user.id);
              if (customerInfo) {
                await get().syncSubscriptionFromRevenueCat();
              }
            }
          } catch (e) {
            console.error('Auth state change error:', e);
          }
        } else {
          set({ profile: null });
        }
      });

      set({ isLoading: false, isInitialized: true });
    } catch (error) {
      console.error('Init error:', error);
      await supabase.auth.signOut().catch(() => {});
      set({ user: null, session: null, profile: null, isLoading: false, isInitialized: true });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, isAuthenticating: true, error: null });
    const { data, error } = await signIn(email, password);

    if (error) {
      set({ isLoading: false, isAuthenticating: false, error: error.message });
      return { success: false, error: error.message };
    }

    // Set session but keep isAuthenticating=true to prevent navigation during setup
    set({ user: data.user, session: data.session, isLoading: false });

    try {
      await get().fetchProfile();
      if (data.user && isRevenueCatReady()) {
        const customerInfo = await identifyUser(data.user.id);
        if (customerInfo) {
          await get().syncSubscriptionFromRevenueCat();
        }
      }
    } catch (e) {
      console.error('Post-login setup error:', e);
    }

    // NOW allow navigation by releasing the auth gate
    set({ isAuthenticating: false });
    return { success: true };
  },

  register: async (email, password) => {
    set({ isLoading: true, isAuthenticating: true, error: null });
    const { data, error } = await signUp(email, password);

    if (error) {
      set({ isLoading: false, isAuthenticating: false, error: error.message });
      return { success: false, error: error.message };
    }

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
      if (profileError) console.error('Profile creation error:', profileError);

      // Set session but keep isAuthenticating=true to prevent navigation during setup
      set({ user: data.user, session: data.session, isLoading: false });

      try {
        await get().fetchProfile();
      } catch (e) {
        console.error('Post-register setup error:', e);
      }
    } else {
      set({ isLoading: false });
    }

    // NOW allow navigation by releasing the auth gate
    set({ isAuthenticating: false });
    return { success: true };
  },

  logout: async () => {
    set({ isLoading: true });
    if (isRevenueCatReady()) await logoutRevenueCat();
    await signOut();
    set({ user: null, session: null, profile: null, isLoading: false });
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
      .from('profiles').select('*').eq('id', user.id).single();
    if (error) {
      console.error('Fetch profile error:', error);
      return;
    }
    set({ profile: data as Profile });
  },

  updateSubscriptionTier: async (tier, persistToDatabase = true) => {
    const { profile, user } = get();
    if (profile) {
      set({ profile: { ...profile, subscription_tier: tier } });
      if (persistToDatabase && user) {
        try {
          const { error } = await supabase
            .from('profiles').update({ subscription_tier: tier }).eq('id', user.id);
          if (error) console.error('Failed to persist subscription tier:', error);
        } catch (err) {
          console.error('Error persisting subscription tier:', err);
        }
      }
    }
  },

  syncSubscriptionFromRevenueCat: async () => {
    if (!isRevenueCatReady()) return;
    try {
      // getRecommendedTier returns null when RC has no purchase history for this user.
      // This prevents false downgrades for sandbox/test purchases made outside RC.
      const tier = await getRecommendedTier();
      if (tier === null) return; // RC has no opinion — trust Supabase as-is
      const { profile } = get();
      if (profile && profile.subscription_tier !== tier) {
        await get().updateSubscriptionTier(tier, true);
      }
    } catch (error) {
      console.error('Failed to sync subscription from RevenueCat:', error);
    }
  },

  clearError: () => set({ error: null }),
}));
