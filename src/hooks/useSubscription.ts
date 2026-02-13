// Hook for subscription state management
import { useState, useEffect, useCallback, useRef } from 'react';
import { CustomerInfo, PurchasesPackage, PurchasesOffering } from 'react-native-purchases';
import {
  initializeRevenueCat,
  identifyUser,
  getCustomerInfo,
  getCurrentTier,
  getRecommendedTier,
  getOfferings,
  purchasePackage,
  restorePurchases,
  addCustomerInfoUpdateListener,
  isRevenueCatConfigured,
  isRevenueCatReady,
  SubscriptionTier,
  TIER_LIMITS,
  ENTITLEMENTS,
} from '@/services/revenuecat';
import { useAuthStore } from '@/store/authStore';

export interface SubscriptionState {
  isLoading: boolean;
  isConfigured: boolean;
  tier: SubscriptionTier;
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOffering | null;
  limits: typeof TIER_LIMITS.free;
}

export function useSubscription() {
  const { user, updateSubscriptionTier, profile } = useAuthStore();
  const [state, setState] = useState<SubscriptionState>({
    isLoading: true,
    isConfigured: isRevenueCatConfigured(),
    tier: 'free',
    customerInfo: null,
    offerings: null,
    limits: TIER_LIMITS.free,
  });

  // Initialize RevenueCat on mount
  useEffect(() => {
    const init = async () => {
      if (!isRevenueCatConfigured()) {
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      await initializeRevenueCat(user?.id);

      // Identify user with RevenueCat
      if (user?.id) {
        await identifyUser(user.id);
      }

      const [customerInfo, tier, recommendedTier, offerings] = await Promise.all([
        getCustomerInfo(),
        getCurrentTier(),
        getRecommendedTier(),
        getOfferings(),
      ]);

      setState({
        isLoading: false,
        isConfigured: true,
        tier,
        customerInfo,
        offerings,
        limits: TIER_LIMITS[tier],
      });

      // Smart sync: only update if RC has an actual opinion (non-null)
      // null means RC has no purchase history → trust Supabase
      if (recommendedTier !== null && profile?.subscription_tier !== recommendedTier) {
        await updateSubscriptionTier(recommendedTier, true);
      }
    };

    init();
  }, [user?.id]);

  // Use refs to access latest values without re-adding listeners
  const profileTierRef = useRef(profile?.subscription_tier);
  profileTierRef.current = profile?.subscription_tier;
  const updateTierRef = useRef(updateSubscriptionTier);
  updateTierRef.current = updateSubscriptionTier;

  // Listen for subscription updates — only set up once
  useEffect(() => {
    if (!isRevenueCatReady()) return;

    const listener = async (info: CustomerInfo) => {
      const tier = await getCurrentTier();
      const recommendedTier = await getRecommendedTier();
      setState((prev) => ({
        ...prev,
        customerInfo: info,
        tier,
        limits: TIER_LIMITS[tier],
      }));

      // Smart sync: only update if RC has an actual opinion (non-null)
      if (recommendedTier !== null && profileTierRef.current !== recommendedTier) {
        await updateTierRef.current(recommendedTier, true);
      }
    };

    const unsubscribe = addCustomerInfoUpdateListener(listener);
    return unsubscribe;
  }, []);

  // Purchase a package
  const purchase = useCallback(async (pkg: PurchasesPackage) => {
    setState((prev) => ({ ...prev, isLoading: true }));

    const result = await purchasePackage(pkg);

    if (result.success && result.customerInfo) {
      const tier = await getCurrentTier();
      setState((prev) => ({
        ...prev,
        isLoading: false,
        customerInfo: result.customerInfo!,
        tier,
        limits: TIER_LIMITS[tier],
      }));

      // Sync tier to authStore and Supabase after successful purchase
      await updateSubscriptionTier(tier, true);
    } else {
      setState((prev) => ({ ...prev, isLoading: false }));
    }

    return result;
  }, [updateSubscriptionTier]);

  // Restore purchases
  const restore = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    const result = await restorePurchases();

    if (result.success && result.customerInfo) {
      const tier = await getCurrentTier();
      setState((prev) => ({
        ...prev,
        isLoading: false,
        customerInfo: result.customerInfo!,
        tier,
        limits: TIER_LIMITS[tier],
      }));

      // Sync tier to authStore and Supabase after restore
      await updateSubscriptionTier(tier, true);
    } else {
      setState((prev) => ({ ...prev, isLoading: false }));
    }

    return result;
  }, [updateSubscriptionTier]);

  // Refresh subscription status
  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    const [customerInfo, tier, offerings] = await Promise.all([
      getCustomerInfo(),
      getCurrentTier(),
      getOfferings(),
    ]);

    setState((prev) => ({
      ...prev,
      isLoading: false,
      customerInfo,
      tier,
      offerings,
      limits: TIER_LIMITS[tier],
    }));
  }, []);

  // Computed values
  const isPremium = state.tier === 'premium' || state.tier === 'premium_plus';
  const isPremiumPlus = state.tier === 'premium_plus';
  const canUseAI = state.limits.aiChat;
  const maxAssets = state.limits.maxAssets;
  const maxAlerts = state.limits.maxAlerts;

  return {
    ...state,
    isPremium,
    isPremiumPlus,
    canUseAI,
    maxAssets,
    maxAlerts,
    purchase,
    restore,
    refresh,
  };
}

export default useSubscription;
