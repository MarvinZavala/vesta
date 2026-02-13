import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { Button } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { Brand, FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';

export default function WelcomeScreen() {
  const { height } = useWindowDimensions();
  const { colors, isDark } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Hero Section */}
      <View style={styles.heroSection}>
        {/* Decorative circles */}
        <Animated.View entering={FadeIn.delay(300).duration(800)} style={[styles.decorCircle1, { backgroundColor: Brand.emerald + '15', top: height * 0.05 }]} />
        <Animated.View entering={FadeIn.delay(400).duration(800)} style={[styles.decorCircle2, { backgroundColor: Brand.gold + '10', bottom: height * 0.02 }]} />

        <Animated.View entering={ZoomIn.delay(100).duration(500)} style={[styles.logoContainer, { backgroundColor: Brand.emerald }]}>
          <Ionicons name="wallet" size={48} color="#FFFFFF" />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(450)}>
          <Text style={[styles.title, { color: colors.text }]}>
            Vesta
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(420).duration(450)}>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Track all your wealth in one place
          </Text>
        </Animated.View>
      </View>

      {/* Features Section */}
      <View style={styles.featuresContainer}>
        <Animated.View entering={FadeInUp.delay(500).duration(400)}>
          <FeatureItem
            icon="pie-chart-outline"
            title="All Asset Types"
            description="Stocks, crypto, gold, real estate & more"
            colors={colors}
          />
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(600).duration(400)}>
          <FeatureItem
            icon="trending-up-outline"
            title="Real-time Prices"
            description="Live updates for your entire portfolio"
            colors={colors}
          />
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(700).duration(400)}>
          <FeatureItem
            icon="bulb-outline"
            title="AI-Powered Insights"
            description="Get personalized recommendations"
            colors={colors}
          />
        </Animated.View>
      </View>

      {/* CTA Section */}
      <Animated.View entering={FadeIn.delay(800).duration(400)} style={styles.ctaContainer}>
        <Link href="/(auth)/sign-up" asChild>
          <Button title="Get Started" fullWidth size="lg" />
        </Link>

        <Link href="/(auth)/sign-in" asChild>
          <Button
            title="I already have an account"
            variant="ghost"
            fullWidth
            size="lg"
            style={{ marginTop: Spacing.md }}
          />
        </Link>
      </Animated.View>
    </SafeAreaView>
  );
}

function FeatureItem({
  icon,
  title,
  description,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={styles.featureItem}>
      <View
        style={[
          styles.featureIcon,
          { backgroundColor: colors.primaryLight + '20' },
        ]}
      >
        <Ionicons name={icon} size={24} color={colors.primary} />
      </View>
      <View style={styles.featureText}>
        <Text style={[styles.featureTitle, { color: colors.text }]}>
          {title}
        </Text>
        <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
          {description}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.xxl,
    position: 'relative',
  },
  decorCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    right: -60,
  },
  decorCircle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    left: -50,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.lg,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  featuresContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: FontSize.sm,
  },
  ctaContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
});
