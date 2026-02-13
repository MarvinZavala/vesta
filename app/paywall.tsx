import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { PurchasesPackage } from 'react-native-purchases';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';

type BillingType = 'monthly' | 'yearly';

const PRICE = { monthly: 4.99, yearly: 29.99 };

const FEATURES = [
  { icon: 'infinite' as const, text: 'Unlimited assets & alerts' },
  { icon: 'sparkles' as const, text: 'AI Portfolio Advisor' },
  { icon: 'pulse' as const, text: 'Real-time price updates' },
  { icon: 'pie-chart' as const, text: 'Advanced analysis & insights' },
  { icon: 'download' as const, text: 'Export to CSV & PDF' },
];

function isYearlyPackage(pkg: PurchasesPackage): boolean {
  const id = (pkg.identifier + ' ' + pkg.product.identifier).toLowerCase();
  return String(pkg.packageType).toUpperCase() === 'ANNUAL' || id.includes('annual') || id.includes('year');
}

function isMonthlyPackage(pkg: PurchasesPackage): boolean {
  const id = (pkg.identifier + ' ' + pkg.product.identifier).toLowerCase();
  return String(pkg.packageType).toUpperCase() === 'MONTHLY' || id.includes('month');
}

export default function PaywallScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { updateSubscriptionTier } = useAuthStore();
  const { offerings, isConfigured, purchase, restore } = useSubscription();

  const [billingType, setBillingType] = useState<BillingType>('yearly');
  const [isLoading, setIsLoading] = useState(false);

  const yearlyMonthly = (PRICE.yearly / 12).toFixed(2);
  const savings = Math.round((1 - PRICE.yearly / (PRICE.monthly * 12)) * 100);

  const getSelectedPackage = (): PurchasesPackage | null => {
    if (!offerings?.availablePackages?.length) return null;
    const match = offerings.availablePackages.find((pkg) =>
      billingType === 'yearly' ? isYearlyPackage(pkg) : isMonthlyPackage(pkg)
    );
    return match || offerings.availablePackages[0] || null;
  };

  const handlePurchase = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);

    if (isConfigured) {
      const pkg = getSelectedPackage();
      if (!pkg) {
        setIsLoading(false);
        Alert.alert('Purchase Unavailable', 'No subscription package is currently available.');
        return;
      }
      const result = await purchase(pkg);
      setIsLoading(false);
      if (result.success) {
        Alert.alert('Welcome to Vesta Pro!', 'Your subscription is now active.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else if (result.error !== 'Purchase cancelled') {
        Alert.alert('Purchase Failed', result.error || 'Please try again.');
      }
      return;
    }

    setTimeout(async () => {
      setIsLoading(false);
      await updateSubscriptionTier('premium_plus', true);
      Alert.alert('Welcome to Vesta Pro!', 'Your subscription is now active.', [
        { text: 'Get Started', onPress: () => router.back() },
      ]);
    }, 1500);
  };

  const handleRestore = async () => {
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isConfigured) {
      const result = await restore();
      setIsLoading(false);
      if (result.success && result.customerInfo) {
        const hasActive = Object.keys(result.customerInfo.entitlements.active).length > 0;
        Alert.alert(
          hasActive ? 'Purchases Restored' : 'No Purchases Found',
          hasActive ? 'Your subscription has been restored.' : 'No previous purchases were found.',
          hasActive ? [{ text: 'OK', onPress: () => router.back() }] : undefined
        );
      } else {
        Alert.alert('Restore Failed', result.error || 'Please try again.');
      }
    } else {
      setIsLoading(false);
      Alert.alert('No Purchases Found', 'No previous purchases were found.');
    }
  };

  const accent = isDark ? '#34D399' : '#059669';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Close */}
      <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()} hitSlop={16}>
        <Ionicons name="close" size={24} color={colors.textSecondary} />
      </TouchableOpacity>

      <View style={styles.body}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={[styles.iconBig, { backgroundColor: accent }]}>
            <Ionicons name="diamond" size={28} color="#FFF" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Upgrade to Vesta Pro</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            One plan. Every asset. Full power.
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={[styles.featureIconWrap, { backgroundColor: accent + '12' }]}>
                <Ionicons name={f.icon} size={16} color={accent} />
              </View>
              <Text style={[styles.featureText, { color: colors.text }]}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* Pricing */}
        <View style={styles.pricing}>
          <TouchableOpacity
            style={[
              styles.priceCard,
              {
                borderColor: billingType === 'yearly' ? accent : colors.border,
                backgroundColor: billingType === 'yearly' ? accent + '08' : 'transparent',
              },
            ]}
            onPress={() => setBillingType('yearly')}
            activeOpacity={0.7}
          >
            <View style={styles.priceLeft}>
              <View style={[styles.radio, { borderColor: billingType === 'yearly' ? accent : colors.border }]}>
                {billingType === 'yearly' && <View style={[styles.radioFill, { backgroundColor: accent }]} />}
              </View>
              <View>
                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, { color: colors.text }]}>Yearly</Text>
                  <View style={[styles.saveBadge, { backgroundColor: '#F59E0B' }]}>
                    <Text style={styles.saveText}>-{savings}%</Text>
                  </View>
                </View>
                <Text style={[styles.priceSub, { color: colors.textTertiary }]}>${yearlyMonthly}/mo</Text>
              </View>
            </View>
            <Text style={[styles.priceAmount, { color: colors.text }]}>${PRICE.yearly}<Text style={styles.pricePer}>/yr</Text></Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.priceCard,
              {
                borderColor: billingType === 'monthly' ? accent : colors.border,
                backgroundColor: billingType === 'monthly' ? accent + '08' : 'transparent',
              },
            ]}
            onPress={() => setBillingType('monthly')}
            activeOpacity={0.7}
          >
            <View style={styles.priceLeft}>
              <View style={[styles.radio, { borderColor: billingType === 'monthly' ? accent : colors.border }]}>
                {billingType === 'monthly' && <View style={[styles.radioFill, { backgroundColor: accent }]} />}
              </View>
              <Text style={[styles.priceLabel, { color: colors.text }]}>Monthly</Text>
            </View>
            <Text style={[styles.priceAmount, { color: colors.text }]}>${PRICE.monthly}<Text style={styles.pricePer}>/mo</Text></Text>
          </TouchableOpacity>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.cta, { backgroundColor: accent, opacity: isLoading ? 0.7 : 1 }]}
          onPress={handlePurchase}
          activeOpacity={0.85}
          disabled={isLoading}
        >
          <Text style={styles.ctaText}>
            {isLoading ? 'Processing...' : billingType === 'yearly' ? 'Start 7-Day Free Trial' : 'Subscribe Now'}
          </Text>
        </TouchableOpacity>

        {billingType === 'yearly' && (
          <Text style={[styles.trialNote, { color: colors.textTertiary }]}>
            7 days free, then ${PRICE.yearly}/year. Cancel anytime.
          </Text>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={handleRestore}>
            <Text style={[styles.footerLink, { color: colors.textSecondary }]}>Restore Purchases</Text>
          </TouchableOpacity>
          <Text style={[styles.footerDot, { color: colors.textTertiary }]}> · </Text>
          <Text style={[styles.footerLink, { color: colors.textSecondary }]}>Terms</Text>
          <Text style={[styles.footerDot, { color: colors.textTertiary }]}> · </Text>
          <Text style={[styles.footerLink, { color: colors.textSecondary }]}>Privacy</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  closeBtn: { position: 'absolute', top: 56, right: 20, zIndex: 10 },
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.lg },

  // Hero
  hero: { alignItems: 'center', marginBottom: 24 },
  iconBig: {
    width: 56, height: 56, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  title: { fontSize: 24, fontWeight: FontWeight.bold, letterSpacing: -0.5 },
  subtitle: { fontSize: FontSize.md, marginTop: 4 },

  // Features
  features: { gap: 10, marginBottom: 24 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIconWrap: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  featureText: { fontSize: 15, fontWeight: FontWeight.medium },

  // Pricing
  pricing: { gap: 10, marginBottom: 20 },
  priceCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderRadius: 14, borderWidth: 2,
  },
  priceLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  radioFill: { width: 10, height: 10, borderRadius: 5 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  priceLabel: { fontSize: 15, fontWeight: FontWeight.semibold },
  priceSub: { fontSize: 12, marginTop: 1 },
  priceAmount: { fontSize: 18, fontWeight: FontWeight.bold, letterSpacing: -0.3 },
  pricePer: { fontSize: 13, fontWeight: FontWeight.regular },
  saveBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  saveText: { color: '#FFF', fontSize: 10, fontWeight: FontWeight.bold },

  // CTA
  cta: {
    height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  ctaText: { color: '#FFF', fontSize: 17, fontWeight: FontWeight.bold, letterSpacing: -0.3 },
  trialNote: { fontSize: 12, textAlign: 'center', marginTop: 6 },

  // Footer
  footer: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    marginTop: 16,
  },
  footerLink: { fontSize: 12, fontWeight: FontWeight.medium },
  footerDot: { fontSize: 12 },
});
