// RevenueCat Service for subscription management
// Documentation: https://docs.revenuecat.com/docs/react-native

import { Platform } from 'react-native';
import Purchases, {
  PurchasesPackage,
  CustomerInfo,
  PurchasesOffering,
  LOG_LEVEL,
} from 'react-native-purchases';

// API Keys from environment
const REVENUECAT_IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS || '';
const REVENUECAT_ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID || '';

// Product identifiers (must match App Store Connect / Google Play Console)
export const PRODUCT_IDS = {
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
  // Legacy IDs (keeping for compatibility)
  PREMIUM_MONTHLY: 'vesta_premium_monthly',
  PREMIUM_YEARLY: 'vesta_premium_yearly',
  PREMIUM_PLUS_MONTHLY: 'vesta_premium_plus_monthly',
  PREMIUM_PLUS_YEARLY: 'vesta_premium_plus_yearly',
};

// Entitlement identifiers (from RevenueCat dashboard)
export const ENTITLEMENTS = {
  VESTA_PRO: 'Vesta Pro', // Main entitlement
  PREMIUM: 'premium',     // Legacy
  PREMIUM_PLUS: 'premium_plus', // Legacy
};

// Subscription tier type
export type SubscriptionTier = 'free' | 'premium' | 'premium_plus';

// Feature limits by tier
export const TIER_LIMITS = {
  free: {
    maxAssets: 5,
    maxAlerts: 3,
    maxPortfolios: 1,
    aiChat: false,
    advancedAnalysis: false,
    exportData: false,
    priceRefreshInterval: 15 * 60 * 1000, // 15 minutes
  },
  premium: {
    maxAssets: Infinity,
    maxAlerts: Infinity,
    maxPortfolios: Infinity,
    aiChat: true,
    advancedAnalysis: true,
    exportData: true,
    priceRefreshInterval: 60 * 1000, // 1 minute
  },
  premium_plus: {
    maxAssets: Infinity,
    maxAlerts: Infinity,
    maxPortfolios: Infinity,
    aiChat: true,
    advancedAnalysis: true,
    exportData: true,
    priceRefreshInterval: 60 * 1000, // 1 minute
  },
};

let isInitialized = false;

/**
 * Initialize RevenueCat SDK
 * Should be called once at app startup
 */
export async function initializeRevenueCat(userId?: string): Promise<void> {
  if (isInitialized) return;

  const apiKey = Platform.OS === 'ios' ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;

  if (!apiKey) {
    console.warn('RevenueCat API key not configured. Subscription features will be disabled.');
    return;
  }

  try {
    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);

    await Purchases.configure({
      apiKey,
      appUserID: userId || undefined,
    });

    isInitialized = true;
    console.log('RevenueCat initialized successfully');
  } catch (error) {
    console.error('Failed to initialize RevenueCat:', error);
  }
}

/**
 * Identify user with RevenueCat (call after login)
 */
export async function identifyUser(userId: string): Promise<CustomerInfo | null> {
  if (!isInitialized) {
    console.warn('RevenueCat not initialized');
    return null;
  }

  try {
    const { customerInfo } = await Purchases.logIn(userId);
    return customerInfo;
  } catch (error) {
    console.error('Failed to identify user:', error);
    return null;
  }
}

/**
 * Logout user from RevenueCat (call after logout)
 */
export async function logoutRevenueCat(): Promise<void> {
  if (!isInitialized) return;

  try {
    await Purchases.logOut();
  } catch (error) {
    console.error('Failed to logout from RevenueCat:', error);
  }
}

/**
 * Get current customer info and subscription status
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!isInitialized) {
    console.warn('RevenueCat not initialized');
    return null;
  }

  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    console.error('Failed to get customer info:', error);
    return null;
  }
}

/**
 * Derive tier from a CustomerInfo object (pure, no async)
 */
function deriveTierFromCustomerInfo(customerInfo: CustomerInfo): SubscriptionTier {
  const activeEntitlementIds = Object.keys(customerInfo.entitlements.active || {});
  const normalizedEntitlementIds = activeEntitlementIds.map((id) =>
    id.toLowerCase().replace(/\s+/g, '_')
  );

  if (
    normalizedEntitlementIds.some((id) =>
      id === 'vesta_pro' ||
      id.includes('premium_plus') ||
      id.endsWith('_plus') ||
      id.endsWith('_pro')
    )
  ) {
    return 'premium_plus';
  }

  if (
    normalizedEntitlementIds.some((id) => id === 'premium' || id.includes('premium'))
  ) {
    return 'premium';
  }

  const activeProductIds = [
    ...(customerInfo.activeSubscriptions || []),
    ...Object.values(customerInfo.entitlements.active || {})
      .map((entitlement) => entitlement.productIdentifier)
      .filter((productId): productId is string => !!productId),
  ].map((id) => id.toLowerCase());

  if (activeProductIds.some((id) => id.includes('premium_plus') || id.includes('plus') || id.includes('pro'))) {
    return 'premium_plus';
  }
  if (activeProductIds.some((id) => id.includes('premium'))) {
    return 'premium';
  }

  // Backward compatibility for explicit entitlement constants
  if (customerInfo.entitlements.active[ENTITLEMENTS.VESTA_PRO]) return 'premium_plus';
  if (customerInfo.entitlements.active[ENTITLEMENTS.PREMIUM_PLUS]) return 'premium_plus';
  if (customerInfo.entitlements.active[ENTITLEMENTS.PREMIUM]) return 'premium';

  return 'free';
}

/**
 * Get current subscription tier based on entitlements
 */
export async function getCurrentTier(): Promise<SubscriptionTier> {
  const customerInfo = await getCustomerInfo();
  if (!customerInfo) return 'free';
  return deriveTierFromCustomerInfo(customerInfo);
}

/**
 * Smart sync: returns the tier RC recommends, or null if RC has no opinion.
 * RC has "no opinion" when the user never purchased through RC
 * (allPurchasedProductIdentifiers is empty). In that case, callers should
 * trust the existing Supabase tier and NOT downgrade.
 */
export async function getRecommendedTier(): Promise<SubscriptionTier | null> {
  const customerInfo = await getCustomerInfo();
  if (!customerInfo) return null; // RC not available — no opinion

  const tier = deriveTierFromCustomerInfo(customerInfo);

  if (tier !== 'free') {
    // RC says user has an active subscription — trust it
    return tier;
  }

  // RC says 'free'. Check if the user ever purchased through RC.
  // If they have purchase history, their subscription genuinely expired → return 'free'.
  // If no history, RC was never involved → return null (no opinion).
  const hasPurchaseHistory = customerInfo.allPurchasedProductIdentifiers.length > 0;
  return hasPurchaseHistory ? 'free' : null;
}

/**
 * Get available offerings (subscription packages)
 */
export async function getOfferings(): Promise<PurchasesOffering | null> {
  if (!isInitialized) {
    console.warn('RevenueCat not initialized');
    return null;
  }

  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (error) {
    console.error('Failed to get offerings:', error);
    return null;
  }
}

/**
 * Purchase a subscription package
 */
export async function purchasePackage(
  pkg: PurchasesPackage
): Promise<{ success: boolean; customerInfo?: CustomerInfo; error?: string }> {
  if (!isInitialized) {
    return { success: false, error: 'RevenueCat not initialized' };
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { success: true, customerInfo };
  } catch (error: any) {
    // Handle user cancellation
    if (error.userCancelled) {
      return { success: false, error: 'Purchase cancelled' };
    }

    console.error('Purchase failed:', error);
    return { success: false, error: error.message || 'Purchase failed' };
  }
}

/**
 * Restore previous purchases
 */
export async function restorePurchases(): Promise<{
  success: boolean;
  customerInfo?: CustomerInfo;
  error?: string;
}> {
  if (!isInitialized) {
    return { success: false, error: 'RevenueCat not initialized' };
  }

  try {
    const customerInfo = await Purchases.restorePurchases();
    return { success: true, customerInfo };
  } catch (error: any) {
    console.error('Restore failed:', error);
    return { success: false, error: error.message || 'Restore failed' };
  }
}

/**
 * Check if user has specific entitlement
 */
export async function hasEntitlement(entitlementId: string): Promise<boolean> {
  const customerInfo = await getCustomerInfo();
  return !!customerInfo?.entitlements.active[entitlementId];
}

/**
 * Check if user has premium (either tier)
 */
export async function isPremium(): Promise<boolean> {
  const tier = await getCurrentTier();
  return tier === 'premium' || tier === 'premium_plus';
}

/**
 * Check if user has Premium+ (AI features)
 */
export async function isPremiumPlus(): Promise<boolean> {
  const tier = await getCurrentTier();
  return tier === 'premium_plus';
}

/**
 * Get feature limits for current tier
 */
export async function getFeatureLimits() {
  const tier = await getCurrentTier();
  return TIER_LIMITS[tier];
}

/**
 * Listen for customer info updates
 */
export function addCustomerInfoUpdateListener(
  callback: (info: CustomerInfo) => void
): () => void {
  if (!isInitialized) {
    console.warn('RevenueCat not initialized');
    return () => {};
  }

  Purchases.addCustomerInfoUpdateListener(callback);

  // SDK v9+ supports removeCustomerInfoUpdateListener for proper cleanup
  return () => {
    Purchases.removeCustomerInfoUpdateListener(callback);
  };
}

/**
 * Check if RevenueCat is properly configured (API key exists)
 */
export function isRevenueCatConfigured(): boolean {
  const apiKey = Platform.OS === 'ios' ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;
  return !!apiKey;
}

/**
 * Check if RevenueCat SDK is fully initialized and ready to use.
 * Unlike isRevenueCatConfigured(), this confirms the SDK has been configured.
 */
export function isRevenueCatReady(): boolean {
  return isInitialized;
}

/**
 * Format price for display
 */
export function formatPackagePrice(pkg: PurchasesPackage): string {
  return pkg.product.priceString;
}

/**
 * Get subscription period string
 */
export function getPackagePeriod(pkg: PurchasesPackage): string {
  switch (pkg.packageType) {
    case 'MONTHLY':
      return 'month';
    case 'ANNUAL':
      return 'year';
    case 'WEEKLY':
      return 'week';
    case 'LIFETIME':
      return 'lifetime';
    default:
      return '';
  }
}
