import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const { colors, isDark } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Hero Section */}
      <View style={styles.heroSection}>
        <Animated.View
          entering={FadeIn.delay(200).duration(800)}
          style={[styles.logoContainer, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="analytics" size={48} color="#FFFFFF" />
        </Animated.View>

        <Animated.Text
          entering={FadeInUp.delay(400).duration(600)}
          style={[styles.title, { color: colors.text }]}
        >
          Vesta
        </Animated.Text>

        <Animated.Text
          entering={FadeInUp.delay(500).duration(600)}
          style={[styles.subtitle, { color: colors.textSecondary }]}
        >
          Track all your wealth in one place
        </Animated.Text>
      </View>

      {/* Features Section */}
      <Animated.View
        entering={FadeInDown.delay(600).duration(600)}
        style={styles.featuresContainer}
      >
        <FeatureItem
          icon="pie-chart-outline"
          title="All Asset Types"
          description="Stocks, crypto, gold, real estate & more"
          colors={colors}
        />
        <FeatureItem
          icon="trending-up-outline"
          title="Real-time Prices"
          description="Live updates for your entire portfolio"
          colors={colors}
        />
        <FeatureItem
          icon="bulb-outline"
          title="AI-Powered Insights"
          description="Get personalized recommendations"
          colors={colors}
        />
      </Animated.View>

      {/* CTA Section */}
      <Animated.View
        entering={FadeInDown.delay(800).duration(600)}
        style={styles.ctaContainer}
      >
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
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.sm,
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
