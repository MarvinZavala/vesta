import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Card, AnimatedCounter, PercentCounter } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { usePortfolioStore } from '@/store/portfolioStore';
import { useAuthStore } from '@/store/authStore';
import {
  formatCurrency,
  formatPercent,
  ASSET_TYPE_LABELS,
  ASSET_TYPE_COLORS,
} from '@/utils/formatters';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { profile } = useAuthStore();
  const {
    activePortfolio,
    holdingsWithPrices,
    summary,
    isLoading,
    fetchPortfolios,
  } = usePortfolioStore();

  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    fetchPortfolios();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPortfolios();
    setRefreshing(false);
  };

  const isPremium = profile?.subscription_tier !== 'free';

  // Get top holdings (max 5)
  const topHoldings = [...holdingsWithPrices]
    .sort((a, b) => b.current_value - a.current_value)
    .slice(0, 5);

  // Get allocation data for pie chart visualization
  const allocationData = summary?.allocation_by_type
    ? Object.entries(summary.allocation_by_type)
        .filter(([_, value]) => value > 0)
        .sort((a, b) => b[1] - a[1])
    : [];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Portfolio Value Card */}
      <Animated.View entering={FadeInDown.duration(600)}>
        <Card style={styles.valueCard} padding="lg">
          <Text style={[styles.valueLabel, { color: colors.textSecondary }]}>
            Total Portfolio Value
          </Text>

          <AnimatedCounter
            value={summary?.total_value ?? 0}
            style={[styles.valueAmount, { color: colors.text }]}
          />

          <View style={styles.changeRow}>
            <View
              style={[
                styles.changeBadge,
                {
                  backgroundColor:
                    (summary?.day_change ?? 0) >= 0
                      ? colors.successLight
                      : colors.errorLight,
                },
              ]}
            >
              <Ionicons
                name={(summary?.day_change ?? 0) >= 0 ? 'trending-up' : 'trending-down'}
                size={16}
                color={(summary?.day_change ?? 0) >= 0 ? colors.gain : colors.loss}
              />
              <Text
                style={[
                  styles.changeText,
                  {
                    color:
                      (summary?.day_change ?? 0) >= 0 ? colors.gain : colors.loss,
                  },
                ]}
              >
                {formatCurrency(Math.abs(summary?.day_change ?? 0))} (
                {formatPercent(summary?.day_change_percent ?? 0)})
              </Text>
            </View>
            <Text style={[styles.changeLabel, { color: colors.textSecondary }]}>
              Today
            </Text>
          </View>

          {/* All-time gain/loss */}
          <View style={[styles.allTimeRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.allTimeLabel, { color: colors.textSecondary }]}>
              All-time
            </Text>
            <Text
              style={[
                styles.allTimeValue,
                {
                  color:
                    (summary?.total_gain_loss ?? 0) >= 0 ? colors.gain : colors.loss,
                },
              ]}
            >
              {formatCurrency(summary?.total_gain_loss ?? 0)} (
              {formatPercent(summary?.total_gain_loss_percent ?? 0)})
            </Text>
          </View>
        </Card>
      </Animated.View>

      {/* Quick Actions */}
      <Animated.View
        entering={FadeInDown.delay(100).duration(600)}
        style={styles.quickActions}
      >
        <QuickActionButton
          icon="add-circle-outline"
          label="Add Asset"
          onPress={() => router.push('/(tabs)/portfolio')}
          colors={colors}
        />
        <QuickActionButton
          icon="sparkles-outline"
          label="AI Insights"
          onPress={() => {
            if (isPremium) {
              router.push('/ai-chat');
            } else {
              router.push('/paywall');
            }
          }}
          colors={colors}
          badge={!isPremium ? 'PRO' : undefined}
        />
        <QuickActionButton
          icon="pie-chart-outline"
          label="Analysis"
          onPress={() => router.push('/(tabs)/analysis')}
          colors={colors}
        />
      </Animated.View>

      {/* Asset Allocation */}
      {allocationData.length > 0 && (
        <Animated.View entering={FadeInDown.delay(200).duration(600)}>
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Asset Allocation
              </Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/analysis')}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>
                  See Details
                </Text>
              </TouchableOpacity>
            </View>

            {/* Simple allocation bars */}
            <View style={styles.allocationBars}>
              {allocationData.map(([type, percent]) => (
                <View key={type} style={styles.allocationItem}>
                  <View style={styles.allocationLabelRow}>
                    <View
                      style={[
                        styles.allocationDot,
                        { backgroundColor: ASSET_TYPE_COLORS[type] || colors.primary },
                      ]}
                    />
                    <Text style={[styles.allocationLabel, { color: colors.text }]}>
                      {ASSET_TYPE_LABELS[type] || type}
                    </Text>
                    <Text
                      style={[
                        styles.allocationPercent,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {percent.toFixed(1)}%
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.allocationBarBg,
                      { backgroundColor: colors.backgroundTertiary },
                    ]}
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
      )}

      {/* Top Holdings */}
      {topHoldings.length > 0 && (
        <Animated.View entering={FadeInDown.delay(300).duration(600)}>
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Top Holdings
              </Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/portfolio')}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>
                  See All
                </Text>
              </TouchableOpacity>
            </View>

            {topHoldings.map((holding, index) => (
              <View
                key={holding.id}
                style={[
                  styles.holdingItem,
                  index < topHoldings.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <View style={styles.holdingLeft}>
                  <View
                    style={[
                      styles.holdingIcon,
                      {
                        backgroundColor:
                          (ASSET_TYPE_COLORS[holding.asset_type] || colors.primary) +
                          '20',
                      },
                    ]}
                  >
                    <Text style={styles.holdingSymbol}>
                      {(holding.symbol || holding.name).slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={[styles.holdingName, { color: colors.text }]}>
                      {holding.symbol || holding.name}
                    </Text>
                    <Text
                      style={[
                        styles.holdingType,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {ASSET_TYPE_LABELS[holding.asset_type]}
                    </Text>
                  </View>
                </View>
                <View style={styles.holdingRight}>
                  <Text style={[styles.holdingValue, { color: colors.text }]}>
                    {formatCurrency(holding.current_value)}
                  </Text>
                  <Text
                    style={[
                      styles.holdingChange,
                      {
                        color:
                          holding.gain_loss_percent >= 0 ? colors.gain : colors.loss,
                      },
                    ]}
                  >
                    {formatPercent(holding.gain_loss_percent)}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        </Animated.View>
      )}

      {/* Empty State */}
      {holdingsWithPrices.length === 0 && !isLoading && (
        <Animated.View entering={FadeInDown.delay(200).duration(600)}>
          <Card style={styles.emptyCard} padding="lg">
            <Ionicons
              name="briefcase-outline"
              size={48}
              color={colors.textTertiary}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No Assets Yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Start tracking your wealth by adding your first asset
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/(tabs)/portfolio')}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.emptyButtonText}>Add Your First Asset</Text>
            </TouchableOpacity>
          </Card>
        </Animated.View>
      )}
    </ScrollView>
  );
}

function QuickActionButton({
  icon,
  label,
  onPress,
  colors,
  badge,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
  badge?: string;
}) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <View
        style={[
          styles.quickActionIcon,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        <Ionicons name={icon} size={24} color={colors.primary} />
        {badge && (
          <View style={[styles.badge, { backgroundColor: colors.primary }]}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.quickActionLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
    </TouchableOpacity>
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
  valueCard: {
    marginBottom: Spacing.md,
  },
  valueLabel: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.xs,
  },
  valueAmount: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.sm,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  changeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  changeLabel: {
    fontSize: FontSize.sm,
  },
  allTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  allTimeLabel: {
    fontSize: FontSize.sm,
  },
  allTimeValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.md,
  },
  quickAction: {
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  quickActionLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  sectionCard: {
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  seeAll: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  allocationBars: {
    gap: Spacing.sm,
  },
  allocationItem: {
    gap: Spacing.xs,
  },
  allocationLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  allocationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  allocationBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  holdingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  holdingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  holdingIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdingSymbol: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: '#6366F1',
  },
  holdingName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  holdingType: {
    fontSize: FontSize.xs,
  },
  holdingRight: {
    alignItems: 'flex-end',
  },
  holdingValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  holdingChange: {
    fontSize: FontSize.sm,
  },
  emptyCard: {
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
});
