import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { PurchasesPackage } from 'react-native-purchases';
import { Button, Card } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import { FontSize, FontWeight, Spacing, BorderRadius, Brand } from '@/constants/theme';

type PlanType = 'premium' | 'premium_plus';
type BillingType = 'monthly' | 'yearly';

const PLANS = {
  premium: {
    name: 'Premium',
    monthly: 4.99,
    yearly: 39.99,
    features: [
      'Unlimited assets',
      'Real-time price updates',
      'Multi-currency support',
      'Unlimited price alerts',
      'Sector & country analysis',
      'Export to CSV/PDF',
    ],
  },
  premium_plus: {
    name: 'Premium+',
    monthly: 9.99,
    yearly: 79.99,
    features: [
      'Everything in Premium',
      'AI Portfolio Advisor',
      'Personalized recommendations',
      'Risk analysis & scoring',
      'Rebalancing suggestions',
      'Weekly AI reports',
    ],
  },
};

function normalizeId(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '_');
}

function isYearlyPackage(pkg: PurchasesPackage): boolean {
  const identifier = normalizeId(pkg.identifier);
  const productIdentifier = normalizeId(pkg.product.identifier);
  const packageType = String(pkg.packageType).toUpperCase();

  return (
    packageType === 'ANNUAL' ||
    identifier.includes('annual') ||
    identifier.includes('year') ||
    identifier.includes('yearly') ||
    productIdentifier.includes('annual') ||
    productIdentifier.includes('year') ||
    productIdentifier.includes('yearly')
  );
}

function isMonthlyPackage(pkg: PurchasesPackage): boolean {
  const identifier = normalizeId(pkg.identifier);
  const productIdentifier = normalizeId(pkg.product.identifier);
  const packageType = String(pkg.packageType).toUpperCase();

  return (
    packageType === 'MONTHLY' ||
    identifier.includes('month') ||
    identifier.includes('monthly') ||
    productIdentifier.includes('month') ||
    productIdentifier.includes('monthly')
  );
}

function packageMatchesPlan(pkg: PurchasesPackage, plan: PlanType): number {
  const identifier = normalizeId(pkg.identifier);
  const productIdentifier = normalizeId(pkg.product.identifier);
  const fullId = `${identifier} ${productIdentifier}`;

  const includesPlus = fullId.includes('premium_plus') || fullId.includes('plus') || fullId.includes('vesta_pro');
  const includesPremium = fullId.includes('premium');

  if (plan === 'premium_plus') {
    if (includesPlus) return 3;
    if (includesPremium) return 1;
    return 0;
  }

  // Premium should not accidentally buy plus/pro package
  if (includesPlus) return -2;
  if (includesPremium) return 3;
  return 1;
}

export default function PaywallScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { updateSubscriptionTier } = useAuthStore();
  const { offerings, isConfigured, purchase, restore } = useSubscription();

  const [selectedPlan, setSelectedPlan] = useState<PlanType>('premium_plus');
  const [billingType, setBillingType] = useState<BillingType>('yearly');
  const [isLoading, setIsLoading] = useState(false);

  const plan = PLANS[selectedPlan];
  const monthlyPrice = billingType === 'yearly' ? (plan.yearly / 12).toFixed(2) : plan.monthly;
  const savings = billingType === 'yearly' ? Math.round((1 - plan.yearly / (plan.monthly * 12)) * 100) : 0;

  // Get the correct package from RevenueCat offerings
  const getSelectedPackage = (): PurchasesPackage | null => {
    if (!offerings) return null;
    if (offerings.availablePackages.length === 0) return null;

    const scoredPackages = offerings.availablePackages
      .map((pkg) => {
        const planScore = packageMatchesPlan(pkg, selectedPlan);
        const billingScore = billingType === 'yearly'
          ? (isYearlyPackage(pkg) ? 3 : isMonthlyPackage(pkg) ? -2 : 0)
          : (isMonthlyPackage(pkg) ? 3 : isYearlyPackage(pkg) ? -2 : 0);

        const score = planScore * 10 + billingScore;
        return { pkg, score };
      })
      .sort((a, b) => b.score - a.score);

    const bestMatch = scoredPackages[0];
    if (!bestMatch || bestMatch.score < 0) {
      // As final fallback, use best billing match regardless of plan label.
      const billingMatch = offerings.availablePackages.find((pkg) =>
        billingType === 'yearly' ? isYearlyPackage(pkg) : isMonthlyPackage(pkg)
      );
      return billingMatch || offerings.availablePackages[0] || null;
    }

    return bestMatch.pkg;
  };

  const handlePurchase = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);

    // If RevenueCat is configured, use real purchase
    if (isConfigured) {
      const pkg = getSelectedPackage();
      if (!pkg) {
        setIsLoading(false);
        Alert.alert('Purchase Unavailable', 'No subscription package is currently available for this plan.');
        return;
      }

      const result = await purchase(pkg);
      setIsLoading(false);

      if (result.success) {
        // Note: useSubscription.purchase() already syncs the tier to authStore and Supabase
        Alert.alert(
          'Welcome to ' + plan.name + '!',
          'Your subscription is now active.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else if (result.error !== 'Purchase cancelled') {
        Alert.alert('Purchase Failed', result.error || 'Please try again.');
      }
      return;
    }

    // Sandbox/TestFlight mode - activate subscription for testing
    setTimeout(async () => {
      setIsLoading(false);
      const tier = selectedPlan === 'premium_plus' ? 'premium_plus' : 'premium';
      await updateSubscriptionTier(tier, true);
      Alert.alert(
        'Welcome to ' + plan.name + '!',
        'Your subscription is now active. Enjoy unlimited access to all features.',
        [{ text: 'Get Started', onPress: () => router.back() }]
      );
    }, 1500);
  };

  const handleRestore = async () => {
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (isConfigured) {
      const result = await restore();
      setIsLoading(false);

      if (result.success && result.customerInfo) {
        // Check if any entitlements are actually active after restore
        const hasActive = Object.keys(result.customerInfo.entitlements.active).length > 0;
        if (hasActive) {
          Alert.alert('Purchases Restored', 'Your subscription has been restored.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
        } else {
          Alert.alert('No Purchases Found', 'No previous purchases were found for this account.');
        }
      } else {
        Alert.alert('Restore Failed', result.error || 'Please try again.');
      }
    } else {
      setIsLoading(false);
      Alert.alert('No Purchases Found', 'No previous purchases were found for this account.');
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Sandbox mode banner - only show in development */}
      {!isConfigured && __DEV__ && (
        <View style={[styles.demoBanner, { backgroundColor: Brand.gold + '20' }]}>
          <Ionicons name="information-circle" size={18} color={Brand.gold} />
          <Text style={[styles.demoBannerText, { color: Brand.gold }]}>
            Sandbox Mode - Purchases are simulated for testing
          </Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary }]}>
          <Ionicons name="diamond" size={32} color="#FFFFFF" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>
          Unlock Your Full Potential
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Get unlimited access to all features and AI-powered insights
        </Text>
      </View>

      {/* Plan Selection */}
      <View >
        <View style={[styles.planToggle, { backgroundColor: colors.backgroundTertiary }]}>
          <TouchableOpacity
            style={[
              styles.planTab,
              selectedPlan === 'premium' && {
                backgroundColor: colors.primary,
              },
            ]}
            onPress={() => setSelectedPlan('premium')}
          >
            <Text
              style={[
                styles.planTabText,
                { color: selectedPlan === 'premium' ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              Premium
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.planTab,
              selectedPlan === 'premium_plus' && {
                backgroundColor: colors.primary,
              },
            ]}
            onPress={() => setSelectedPlan('premium_plus')}
          >
            <Text
              style={[
                styles.planTabText,
                { color: selectedPlan === 'premium_plus' ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              Premium+
            </Text>
            <View style={[styles.aiBadge, { backgroundColor: '#F59E0B' }]}>
              <Ionicons name="sparkles" size={10} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Billing Toggle */}
      <View >
        <View style={styles.billingToggle}>
          <TouchableOpacity
            style={[
              styles.billingOption,
              {
                backgroundColor:
                  billingType === 'yearly'
                    ? colors.primary + '20'
                    : colors.backgroundSecondary,
                borderColor:
                  billingType === 'yearly' ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setBillingType('yearly')}
          >
            <View style={styles.billingHeader}>
              <Text
                style={[
                  styles.billingLabel,
                  { color: billingType === 'yearly' ? colors.primary : colors.text },
                ]}
              >
                Yearly
              </Text>
              {savings > 0 && (
                <View style={[styles.savingsBadge, { backgroundColor: colors.gain }]}>
                  <Text style={styles.savingsText}>Save {savings}%</Text>
                </View>
              )}
            </View>
            <Text style={[styles.billingPrice, { color: colors.text }]}>
              ${plan.yearly}/year
            </Text>
            <Text style={[styles.billingMonthly, { color: colors.textSecondary }]}>
              ${monthlyPrice}/month
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.billingOption,
              {
                backgroundColor:
                  billingType === 'monthly'
                    ? colors.primary + '20'
                    : colors.backgroundSecondary,
                borderColor:
                  billingType === 'monthly' ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setBillingType('monthly')}
          >
            <Text
              style={[
                styles.billingLabel,
                { color: billingType === 'monthly' ? colors.primary : colors.text },
              ]}
            >
              Monthly
            </Text>
            <Text style={[styles.billingPrice, { color: colors.text }]}>
              ${plan.monthly}/month
            </Text>
            <Text style={[styles.billingMonthly, { color: colors.textSecondary }]}>
              Cancel anytime
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Features */}
      <View >
        <Card style={styles.featuresCard}>
          <Text style={[styles.featuresTitle, { color: colors.text }]}>
            {plan.name} includes:
          </Text>
          {plan.features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={20} color={colors.gain} />
              <Text style={[styles.featureText, { color: colors.text }]}>
                {feature}
              </Text>
            </View>
          ))}
        </Card>
      </View>

      {/* CTA */}
      <View >
        <Button
          title={`Start ${billingType === 'yearly' ? '7-Day Free Trial' : 'Subscription'}`}
          onPress={handlePurchase}
          loading={isLoading}
          fullWidth
          size="lg"
        />

        {billingType === 'yearly' && (
          <Text style={[styles.trialNote, { color: colors.textSecondary }]}>
            7-day free trial, then ${plan.yearly}/year. Cancel anytime.
          </Text>
        )}

        <TouchableOpacity onPress={handleRestore} style={styles.restoreButton}>
          <Text style={[styles.restoreText, { color: colors.primary }]}>
            Restore Purchases
          </Text>
        </TouchableOpacity>
      </View>

      {/* Legal */}
      <Text style={[styles.legal, { color: colors.textTertiary }]}>
        Payment will be charged to your Apple ID account at confirmation of
        purchase. Subscription automatically renews unless it is canceled at
        least 24 hours before the end of the current period. Your account will
        be charged for renewal within 24 hours prior to the end of the current
        period.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  demoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  demoBannerText: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.md,
    textAlign: 'center',
  },
  planToggle: {
    flexDirection: 'row',
    borderRadius: BorderRadius.full,
    padding: 4,
    marginBottom: Spacing.lg,
  },
  planTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.full,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  planTabText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  aiBadge: {
    padding: 2,
    borderRadius: BorderRadius.full,
  },
  billingToggle: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  billingOption: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
  },
  billingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  billingLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  savingsBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  savingsText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  billingPrice: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  billingMonthly: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  featuresCard: {
    marginBottom: Spacing.lg,
  },
  featuresTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  featureText: {
    fontSize: FontSize.md,
    flex: 1,
  },
  trialNote: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  restoreText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  legal: {
    fontSize: FontSize.xs,
    textAlign: 'center',
    marginTop: Spacing.lg,
    lineHeight: 18,
  },
});
