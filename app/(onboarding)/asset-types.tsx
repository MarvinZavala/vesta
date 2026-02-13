import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { useOnboardingStore } from '@/store/onboardingStore';
import { Brand, FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';

const ASSET_TYPES = [
  { id: 'stock', icon: 'trending-up', label: 'Stocks' },
  { id: 'etf', icon: 'layers', label: 'ETFs' },
  { id: 'crypto', icon: 'logo-bitcoin', label: 'Crypto' },
  { id: 'gold', icon: 'diamond', label: 'Gold & Metals' },
  { id: 'real_estate', icon: 'home', label: 'Real Estate' },
  { id: 'bonds', icon: 'document-text', label: 'Bonds & CDs' },
  { id: 'cash', icon: 'cash', label: 'Cash & Savings' },
  { id: 'other', icon: 'ellipsis-horizontal', label: 'Other' },
];

export default function OnboardingAssetTypes() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { setSelectedAssetTypes, completeOnboarding } = useOnboardingStore();
  const [selected, setSelected] = useState<string[]>([]);

  const toggleAssetType = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(prev =>
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const handleContinue = () => {
    setSelectedAssetTypes(selected);
    router.push('/(onboarding)/complete');
  };

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
              What do you invest in?
            </Text>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(200).duration(450)}>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Select the asset types you want to track (you can change this later)
            </Text>
          </Animated.View>
        </View>

        {/* Asset types grid */}
        <View style={styles.grid}>
          {ASSET_TYPES.map((asset, index) => {
            const isSelected = selected.includes(asset.id);
            return (
              <Animated.View
                key={asset.id}
                entering={FadeInUp.delay(250 + index * 60).duration(350)}
                style={styles.gridItem}
              >
                <TouchableOpacity
                  style={[
                    styles.assetCard,
                    {
                      backgroundColor: isSelected ? Brand.emerald + '10' : colors.card,
                      borderColor: isSelected ? Brand.emerald : colors.border,
                    },
                  ]}
                  onPress={() => toggleAssetType(asset.id)}
                  activeOpacity={0.7}
                >
                  {isSelected && (
                    <View style={[styles.checkMark, { backgroundColor: Brand.emerald }]}>
                      <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                    </View>
                  )}
                  <View
                    style={[
                      styles.assetIcon,
                      {
                        backgroundColor: isSelected
                          ? Brand.emerald + '20'
                          : colors.backgroundSecondary,
                      },
                    ]}
                  >
                    <Ionicons
                      name={asset.icon as any}
                      size={28}
                      color={isSelected ? Brand.emerald : colors.textSecondary}
                    />
                  </View>
                  <Text
                    style={[
                      styles.assetLabel,
                      {
                        color: isSelected ? Brand.emerald : colors.text,
                        fontWeight: isSelected ? FontWeight.semibold : FontWeight.medium,
                      },
                    ]}
                  >
                    {asset.label}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>

      {/* Pagination dots */}
      <View style={styles.pagination}>
        <View style={[styles.dot, { backgroundColor: colors.border }]} />
        <View style={[styles.dot, { backgroundColor: colors.border }]} />
        <View style={[styles.dot, styles.dotActive, { backgroundColor: Brand.emerald }]} />
        <View style={[styles.dot, { backgroundColor: colors.border }]} />
      </View>

      {/* CTA */}
      <Animated.View entering={FadeIn.delay(800).duration(400)} style={styles.ctaContainer}>
        <Button
          title={selected.length > 0 ? `Continue (${selected.length} selected)` : 'Continue'}
          onPress={handleContinue}
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
    paddingHorizontal: Spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '47%',
  },
  assetCard: {
    aspectRatio: 1.1,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    position: 'relative',
  },
  checkMark: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  assetLabel: {
    fontSize: FontSize.sm,
    textAlign: 'center',
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
