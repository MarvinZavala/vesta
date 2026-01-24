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
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Button, Card } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/authStore';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';

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

export default function PaywallScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { profile, updateSubscriptionTier } = useAuthStore();

  const [selectedPlan, setSelectedPlan] = useState<PlanType>('premium_plus');
  const [billingType, setBillingType] = useState<BillingType>('yearly');
  const [isLoading, setIsLoading] = useState(false);

  const plan = PLANS[selectedPlan];
  const price = billingType === 'yearly' ? plan.yearly : plan.monthly;
  const monthlyPrice = billingType === 'yearly' ? (plan.yearly / 12).toFixed(2) : plan.monthly;
  const savings = billingType === 'yearly' ? Math.round((1 - plan.yearly / (plan.monthly * 12)) * 100) : 0;

  const handlePurchase = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);

    // Simulate purchase - In real app, use RevenueCat
    setTimeout(() => {
      setIsLoading(false);
      updateSubscriptionTier(selectedPlan === 'premium_plus' ? 'premium_plus' : 'premium');
      Alert.alert(
        'Welcome to ' + plan.name + '!',
        'Your subscription is now active.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }, 1500);
  };

  const handleRestore = () => {
    Alert.alert('Restore Purchases', 'Checking for previous purchases...', [
      { text: 'OK' },
    ]);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <Animated.View entering={FadeIn.duration(600)} style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary }]}>
          <Ionicons name="diamond" size={32} color="#FFFFFF" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>
          Unlock Your Full Potential
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Get unlimited access to all features and AI-powered insights
        </Text>
      </Animated.View>

      {/* Plan Selection */}
      <Animated.View entering={FadeInDown.delay(100).duration(600)}>
        <View style={styles.planToggle}>
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
      </Animated.View>

      {/* Billing Toggle */}
      <Animated.View entering={FadeInDown.delay(200).duration(600)}>
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
      </Animated.View>

      {/* Features */}
      <Animated.View entering={FadeInDown.delay(300).duration(600)}>
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
      </Animated.View>

      {/* CTA */}
      <Animated.View entering={FadeInDown.delay(400).duration(600)}>
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
      </Animated.View>

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
    backgroundColor: '#F3F4F6',
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
