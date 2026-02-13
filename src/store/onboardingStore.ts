import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OnboardingState {
  hasSeenOnboarding: boolean;
  selectedAssetTypes: string[];
  preferredCurrency: string;
  authIntention: 'sign-up' | 'sign-in' | null;

  // Actions
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  setSelectedAssetTypes: (types: string[]) => void;
  setPreferredCurrency: (currency: string) => void;
  setAuthIntention: (intention: 'sign-up' | 'sign-in') => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasSeenOnboarding: false,
      selectedAssetTypes: [],
      preferredCurrency: 'USD',
      authIntention: null,

      completeOnboarding: () => set({ hasSeenOnboarding: true }),

      resetOnboarding: () => set({
        hasSeenOnboarding: false,
        selectedAssetTypes: [],
        preferredCurrency: 'USD',
        authIntention: null,
      }),

      setSelectedAssetTypes: (types) => set({ selectedAssetTypes: types }),

      setPreferredCurrency: (currency) => set({ preferredCurrency: currency }),

      setAuthIntention: (intention) => set({ authIntention: intention }),
    }),
    {
      name: 'vesta-onboarding',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
