import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { Button } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { useOnboardingStore } from '@/store/onboardingStore';
import { Brand, FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';

export default function OnboardingWelcome() {
  const { width, height } = useWindowDimensions();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { completeOnboarding } = useOnboardingStore();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Skip button */}
      <Animated.View entering={FadeIn.delay(600).duration(400)} style={styles.skipContainer}>
        <Button
          title="Skip"
          variant="ghost"
          size="sm"
          onPress={() => completeOnboarding()}
        />
      </Animated.View>

      {/* Hero illustration */}
      <View style={styles.heroContainer}>
        <Animated.View entering={ZoomIn.delay(150).duration(500)} style={[styles.logoCircle, { backgroundColor: Brand.emerald }]}>
          <Ionicons name="wallet" size={64} color="#FFFFFF" />
        </Animated.View>

        {/* Decorative elements */}
        <Animated.View entering={FadeIn.delay(400).duration(800)} style={[styles.decorCircle1, { backgroundColor: Brand.gold + '30', top: height * 0.12 }]} />
        <Animated.View entering={FadeIn.delay(500).duration(800)} style={[styles.decorCircle2, { backgroundColor: Brand.emerald + '20', bottom: height * 0.05 }]} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <Text style={[styles.title, { color: colors.text }]}>
            Welcome to Vesta
          </Text>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(420).duration(500)}>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            The smart way to track and grow your wealth across all asset types
          </Text>
        </Animated.View>
      </View>

      {/* Pagination dots */}
      <View style={styles.pagination}>
        <View style={[styles.dot, styles.dotActive, { backgroundColor: Brand.emerald }]} />
        <View style={[styles.dot, { backgroundColor: colors.border }]} />
        <View style={[styles.dot, { backgroundColor: colors.border }]} />
        <View style={[styles.dot, { backgroundColor: colors.border }]} />
      </View>

      {/* CTA */}
      <Animated.View entering={FadeInDown.delay(550).duration(400)} style={styles.ctaContainer}>
        <Button
          title="Get Started"
          onPress={() => router.push('/(onboarding)/features')}
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
  heroContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  logoCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  decorCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    right: -40,
  },
  decorCircle2: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    left: -60,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  subtitle: {
    fontSize: FontSize.lg,
    textAlign: 'center',
    lineHeight: 28,
    paddingHorizontal: Spacing.md,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
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
