import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Card, Button } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { usePortfolioStore } from '@/store/portfolioStore';
import { useAuthStore } from '@/store/authStore';
import {
  ASSET_TYPE_LABELS,
  ASSET_TYPE_COLORS,
  SECTOR_COLORS,
} from '@/utils/formatters';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';

const { width } = Dimensions.get('window');

export default function AnalysisScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { profile } = useAuthStore();
  const { summary, holdingsWithPrices } = usePortfolioStore();

  const isPremium = profile?.subscription_tier !== 'free';
  const isPremiumPlus = profile?.subscription_tier === 'premium_plus';

  // Calculate diversification metrics
  const assetTypeData = summary?.allocation_by_type
    ? Object.entries(summary.allocation_by_type)
        .filter(([_, value]) => value > 0)
        .sort((a, b) => b[1] - a[1])
    : [];

  const sectorData = summary?.allocation_by_sector
    ? Object.entries(summary.allocation_by_sector)
        .filter(([_, value]) => value > 0)
        .sort((a, b) => b[1] - a[1])
    : [];

  const countryData = summary?.allocation_by_country
    ? Object.entries(summary.allocation_by_country)
        .filter(([_, value]) => value > 0)
        .sort((a, b) => b[1] - a[1])
    : [];

  // Simple risk score based on concentration
  const calculateRiskScore = () => {
    if (assetTypeData.length === 0) return 0;

    // Higher concentration = higher risk
    const topAssetPercent = assetTypeData[0]?.[1] || 0;
    const diversificationScore = Math.min(100, assetTypeData.length * 15);
    const concentrationPenalty = Math.max(0, topAssetPercent - 40);

    return Math.round(Math.max(0, Math.min(100, 50 + concentrationPenalty - diversificationScore / 2)));
  };

  const riskScore = calculateRiskScore();

  const getRiskLabel = (score: number) => {
    if (score < 30) return { label: 'Low Risk', color: colors.gain };
    if (score < 60) return { label: 'Moderate Risk', color: colors.warning };
    return { label: 'High Risk', color: colors.loss };
  };

  const riskInfo = getRiskLabel(riskScore);

  if (holdingsWithPrices.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyContainer}>
          <Ionicons name="analytics-outline" size={64} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No Data to Analyze
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Add some assets to see your portfolio analysis
          </Text>
          <Button
            title="Add Assets"
            onPress={() => router.push('/(tabs)/portfolio')}
            style={{ marginTop: Spacing.lg }}
          />
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Risk Score */}
      <Animated.View entering={FadeInDown.duration(600)}>
        <Card style={styles.riskCard} padding="lg">
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Portfolio Risk Score
          </Text>

          <View style={styles.riskMeter}>
            <View
              style={[
                styles.riskMeterBg,
                { backgroundColor: colors.backgroundTertiary },
              ]}
            >
              <View
                style={[
                  styles.riskMeterFill,
                  {
                    width: `${riskScore}%`,
                    backgroundColor: riskInfo.color,
                  },
                ]}
              />
            </View>
            <View style={styles.riskLabels}>
              <Text style={[styles.riskLabelText, { color: colors.textSecondary }]}>
                Low
              </Text>
              <Text style={[styles.riskLabelText, { color: colors.textSecondary }]}>
                High
              </Text>
            </View>
          </View>

          <View style={styles.riskResult}>
            <Text style={[styles.riskScore, { color: colors.text }]}>
              {riskScore}
            </Text>
            <Text style={[styles.riskLabel, { color: riskInfo.color }]}>
              {riskInfo.label}
            </Text>
          </View>

          {!isPremiumPlus && (
            <TouchableOpacity
              style={[styles.upgradePrompt, { backgroundColor: colors.primaryLight + '20' }]}
              onPress={() => router.push('/paywall')}
            >
              <Ionicons name="sparkles" size={20} color={colors.primary} />
              <Text style={[styles.upgradeText, { color: colors.primary }]}>
                Get AI-powered risk analysis
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </TouchableOpacity>
          )}
        </Card>
      </Animated.View>

      {/* Asset Allocation */}
      <Animated.View entering={FadeInDown.delay(100).duration(600)}>
        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Asset Allocation
          </Text>

          {/* Donut Chart Placeholder - Visual bars */}
          <View style={styles.allocationBars}>
            {assetTypeData.map(([type, percent], index) => (
              <View key={type} style={styles.allocationItem}>
                <View style={styles.allocationHeader}>
                  <View
                    style={[
                      styles.allocationDot,
                      { backgroundColor: ASSET_TYPE_COLORS[type] || colors.primary },
                    ]}
                  />
                  <Text style={[styles.allocationLabel, { color: colors.text }]}>
                    {ASSET_TYPE_LABELS[type] || type}
                  </Text>
                  <Text style={[styles.allocationPercent, { color: colors.textSecondary }]}>
                    {percent.toFixed(1)}%
                  </Text>
                </View>
                <View
                  style={[styles.allocationBarBg, { backgroundColor: colors.backgroundTertiary }]}
                >
                  <View
                    style={[
                      styles.allocationBarFill,
                      {
                        width: `${percent}%`,
                        backgroundColor: ASSET_TYPE_COLORS[type] || colors.primary,
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </Card>
      </Animated.View>

      {/* Sector Breakdown - Premium */}
      <Animated.View entering={FadeInDown.delay(200).duration(600)}>
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Sector Breakdown
            </Text>
            {!isPremium && (
              <View style={[styles.premiumBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.premiumBadgeText}>PRO</Text>
              </View>
            )}
          </View>

          {isPremium ? (
            sectorData.length > 0 ? (
              <View style={styles.allocationBars}>
                {sectorData.slice(0, 6).map(([sector, percent]) => (
                  <View key={sector} style={styles.allocationItem}>
                    <View style={styles.allocationHeader}>
                      <View
                        style={[
                          styles.allocationDot,
                          { backgroundColor: SECTOR_COLORS[sector] || colors.primary },
                        ]}
                      />
                      <Text style={[styles.allocationLabel, { color: colors.text }]}>
                        {sector}
                      </Text>
                      <Text style={[styles.allocationPercent, { color: colors.textSecondary }]}>
                        {percent.toFixed(1)}%
                      </Text>
                    </View>
                    <View
                      style={[styles.allocationBarBg, { backgroundColor: colors.backgroundTertiary }]}
                    >
                      <View
                        style={[
                          styles.allocationBarFill,
                          {
                            width: `${percent}%`,
                            backgroundColor: SECTOR_COLORS[sector] || colors.primary,
                          },
                        ]}
                      />
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
                Add sector info to your assets to see breakdown
              </Text>
            )
          ) : (
            <View style={styles.lockedContent}>
              <Ionicons name="lock-closed" size={32} color={colors.textTertiary} />
              <Text style={[styles.lockedText, { color: colors.textSecondary }]}>
                Upgrade to Premium to see sector analysis
              </Text>
              <Button
                title="Upgrade"
                size="sm"
                onPress={() => router.push('/paywall')}
                style={{ marginTop: Spacing.sm }}
              />
            </View>
          )}
        </Card>
      </Animated.View>

      {/* Country Exposure - Premium */}
      <Animated.View entering={FadeInDown.delay(300).duration(600)}>
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Geographic Exposure
            </Text>
            {!isPremium && (
              <View style={[styles.premiumBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.premiumBadgeText}>PRO</Text>
              </View>
            )}
          </View>

          {isPremium ? (
            <View style={styles.allocationBars}>
              {countryData.slice(0, 5).map(([country, percent]) => (
                <View key={country} style={styles.allocationItem}>
                  <View style={styles.allocationHeader}>
                    <Text style={styles.countryFlag}>
                      {country === 'US' ? '🇺🇸' : country === 'UK' ? '🇬🇧' : '🌍'}
                    </Text>
                    <Text style={[styles.allocationLabel, { color: colors.text }]}>
                      {country}
                    </Text>
                    <Text style={[styles.allocationPercent, { color: colors.textSecondary }]}>
                      {percent.toFixed(1)}%
                    </Text>
                  </View>
                  <View
                    style={[styles.allocationBarBg, { backgroundColor: colors.backgroundTertiary }]}
                  >
                    <View
                      style={[
                        styles.allocationBarFill,
                        {
                          width: `${percent}%`,
                          backgroundColor: colors.primary,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.lockedContent}>
              <Ionicons name="lock-closed" size={32} color={colors.textTertiary} />
              <Text style={[styles.lockedText, { color: colors.textSecondary }]}>
                Upgrade to Premium to see geographic analysis
              </Text>
            </View>
          )}
        </Card>
      </Animated.View>

      {/* AI Advisor CTA */}
      <Animated.View entering={FadeInDown.delay(400).duration(600)}>
        <Card
          style={[styles.aiCard, { backgroundColor: colors.primary }]}
          padding="lg"
          onPress={() => {
            if (isPremiumPlus) {
              router.push('/ai-chat');
            } else {
              router.push('/paywall');
            }
          }}
        >
          <View style={styles.aiContent}>
            <Ionicons name="sparkles" size={32} color="#FFFFFF" />
            <View style={styles.aiText}>
              <Text style={styles.aiTitle}>AI Portfolio Advisor</Text>
              <Text style={styles.aiSubtitle}>
                {isPremiumPlus
                  ? 'Get personalized insights and recommendations'
                  : 'Upgrade to Premium+ for AI-powered analysis'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
          </View>
        </Card>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  riskCard: {
    marginBottom: Spacing.md,
  },
  sectionCard: {
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.md,
  },
  premiumBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  premiumBadgeText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  riskMeter: {
    marginBottom: Spacing.md,
  },
  riskMeterBg: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  riskMeterFill: {
    height: '100%',
    borderRadius: 6,
  },
  riskLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  riskLabelText: {
    fontSize: FontSize.xs,
  },
  riskResult: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
  },
  riskScore: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.bold,
  },
  riskLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  upgradePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  upgradeText: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  allocationBars: {
    gap: Spacing.md,
  },
  allocationItem: {
    gap: Spacing.xs,
  },
  allocationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  allocationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.sm,
  },
  allocationLabel: {
    flex: 1,
    fontSize: FontSize.sm,
  },
  allocationPercent: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  allocationBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  allocationBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  countryFlag: {
    fontSize: 16,
    marginRight: Spacing.sm,
  },
  lockedContent: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  lockedText: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  noDataText: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  aiCard: {
    marginTop: Spacing.sm,
  },
  aiContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  aiText: {
    flex: 1,
  },
  aiTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
  },
  aiSubtitle: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
});
