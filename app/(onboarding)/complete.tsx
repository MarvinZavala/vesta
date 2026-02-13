import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, FadeInLeft, ZoomIn } from 'react-native-reanimated';
import { Button } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { useOnboardingStore } from '@/store/onboardingStore';
import { Brand, FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';

export default function OnboardingComplete() {
  const { width, height } = useWindowDimensions();
  const { colors, isDark } = useTheme();
  const { completeOnboarding, setAuthIntention } = useOnboardingStore();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Hero */}
      <View style={styles.heroContainer}>
        {/* Success icon - staggered zoom */}
        <Animated.View entering={ZoomIn.delay(100).duration(450)} style={[styles.successCircle, { backgroundColor: Brand.emerald + '15' }]}>
          <Animated.View entering={ZoomIn.delay(200).duration(400)} style={[styles.successCircleInner, { backgroundColor: Brand.emerald + '30' }]}>
            <Animated.View entering={ZoomIn.delay(300).duration(350)} style={[styles.successIcon, { backgroundColor: Brand.emerald }]}>
              <Ionicons name="checkmark" size={48} color="#FFFFFF" />
            </Animated.View>
          </Animated.View>
        </Animated.View>

        {/* Decorative elements */}
        <Animated.View entering={FadeIn.delay(600).duration(600)} style={[styles.decorStar1, { top: height * 0.15, right: width * 0.15 }]}>
          <Ionicons name="sparkles" size={24} color={Brand.gold} />
        </Animated.View>
        <Animated.View entering={FadeIn.delay(700).duration(600)} style={[styles.decorStar2, { top: height * 0.22, left: width * 0.12 }]}>
          <Ionicons name="star" size={16} color={Brand.emerald + '60'} />
        </Animated.View>
        <Animated.View entering={FadeIn.delay(800).duration(600)} style={[styles.decorStar3, { bottom: height * 0.08, right: width * 0.2 }]}>
          <Ionicons name="diamond" size={20} color={Brand.gold + '50'} />
        </Animated.View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Animated.View entering={FadeInDown.delay(400).duration(450)}>
          <Text style={[styles.title, { color: colors.text }]}>
            You're all set!
          </Text>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(500).duration(450)}>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Create your account to start tracking your portfolio and get personalized insights
          </Text>
        </Animated.View>

        {/* Benefits */}
        <View style={styles.benefits}>
          <Animated.View entering={FadeInLeft.delay(600).duration(350)} style={styles.benefitRow}>
            <Ionicons name="shield-checkmark" size={20} color={Brand.emerald} />
            <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
              Bank-level security
            </Text>
          </Animated.View>
          <Animated.View entering={FadeInLeft.delay(700).duration(350)} style={styles.benefitRow}>
            <Ionicons name="sync" size={20} color={Brand.emerald} />
            <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
              Sync across all devices
            </Text>
          </Animated.View>
          <Animated.View entering={FadeInLeft.delay(800).duration(350)} style={styles.benefitRow}>
            <Ionicons name="cloud" size={20} color={Brand.emerald} />
            <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
              Automatic cloud backup
            </Text>
          </Animated.View>
        </View>
      </View>

      {/* Pagination dots */}
      <View style={styles.pagination}>
        <View style={[styles.dot, { backgroundColor: colors.border }]} />
        <View style={[styles.dot, { backgroundColor: colors.border }]} />
        <View style={[styles.dot, { backgroundColor: colors.border }]} />
        <View style={[styles.dot, styles.dotActive, { backgroundColor: Brand.emerald }]} />
      </View>

      {/* CTA */}
      <Animated.View entering={FadeInDown.delay(900).duration(400)} style={styles.ctaContainer}>
        <Button
          title="Create Account"
          onPress={() => {
            setAuthIntention('sign-up');
            completeOnboarding();
          }}
          fullWidth
          size="lg"
        />
        <Button
          title="I already have an account"
          variant="ghost"
          onPress={() => {
            setAuthIntention('sign-in');
            completeOnboarding();
          }}
          fullWidth
          size="lg"
          style={{ marginTop: Spacing.sm }}
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  successCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successCircleInner: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  decorStar1: {
    position: 'absolute',
  },
  decorStar2: {
    position: 'absolute',
  },
  decorStar3: {
    position: 'absolute',
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
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  benefits: {
    gap: Spacing.md,
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.lg,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  benefitText: {
    fontSize: FontSize.md,
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
