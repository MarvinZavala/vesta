import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, FadeInRight } from 'react-native-reanimated';
import { Button } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { useOnboardingStore } from '@/store/onboardingStore';
import { Brand, FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';

const FEATURES = [
  {
    icon: 'pie-chart' as const,
    title: 'All Your Assets',
    description: 'Track stocks, crypto, gold, real estate, bonds, and more in one place',
    color: Brand.emerald,
  },
  {
    icon: 'trending-up' as const,
    title: 'Real-Time Prices',
    description: 'Get live price updates and see your portfolio value change in real time',
    color: '#0284C7',
  },
  {
    icon: 'sparkles' as const,
    title: 'AI-Powered Insights',
    description: 'Get personalized recommendations and risk analysis from our AI advisor',
    color: Brand.gold,
  },
  {
    icon: 'notifications' as const,
    title: 'Smart Alerts',
    description: 'Set price targets and maturity reminders so you never miss an opportunity',
    color: '#DC2626',
  },
];

export default function OnboardingFeatures() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { completeOnboarding } = useOnboardingStore();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Skip button */}
      <View style={styles.skipContainer}>
        <Button
          title="Skip"
          variant="ghost"
          size="sm"
          onPress={() => completeOnboarding()}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Animated.View entering={FadeInDown.delay(100).duration(450)}>
            <Text style={[styles.title, { color: colors.text }]}>
              Everything you need
            </Text>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(200).duration(450)}>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Powerful tools to manage your wealth
            </Text>
          </Animated.View>
        </View>

        {/* Features list */}
        <View style={styles.featuresList}>
          {FEATURES.map((feature, index) => (
            <Animated.View
              key={index}
              entering={FadeInRight.delay(250 + index * 100).duration(400)}
              style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.featureIcon, { backgroundColor: feature.color + '15' }]}>
                <Ionicons name={feature.icon} size={28} color={feature.color} />
              </View>
              <View style={styles.featureContent}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>
                  {feature.title}
                </Text>
                <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
                  {feature.description}
                </Text>
              </View>
            </Animated.View>
          ))}
        </View>
      </ScrollView>

      {/* Pagination dots */}
      <View style={styles.pagination}>
        <View style={[styles.dot, { backgroundColor: colors.border }]} />
        <View style={[styles.dot, styles.dotActive, { backgroundColor: Brand.emerald }]} />
        <View style={[styles.dot, { backgroundColor: colors.border }]} />
        <View style={[styles.dot, { backgroundColor: colors.border }]} />
      </View>

      {/* CTA */}
      <Animated.View entering={FadeIn.delay(700).duration(400)} style={styles.ctaContainer}>
        <Button
          title="Continue"
          onPress={() => router.push('/(onboarding)/asset-types')}
          fullWidth
          size="lg"
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipContainer: {
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    marginTop: Spacing.md,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.md,
    textAlign: 'center',
  },
  featuresList: {
    gap: Spacing.md,
  },
  featureCard: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.md,
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  featureDescription: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
  },
  ctaContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
});
