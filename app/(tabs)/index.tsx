import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { AnimatedCounter, PercentCounter } from '@/components/ui';
import { AllocationPieChart } from '@/components/charts';
import { useTheme } from '@/hooks/useTheme';
import { usePrices } from '@/hooks/usePrices';
import { usePortfolioStore } from '@/store/portfolioStore';
import { useAuthStore } from '@/store/authStore';
import {
  formatCurrency,
  formatPercent,
  ASSET_TYPE_LABELS,
  ASSET_TYPE_COLORS,
  ASSET_TYPE_ICONS,
} from '@/utils/formatters';
import { FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { profile } = useAuthStore();
  const {
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
    await Promise.all([fetchPortfolios(), refreshPrices()]);
    setRefreshing(false);
  };

  const isPremiumPlus = profile?.subscription_tier !== 'free';

  const { refreshPrices } = usePrices({
    subscriptionTier: profile?.subscription_tier || 'free',
    autoRefresh: true,
  });

  const topHoldings = useMemo(
    () => [...holdingsWithPrices].sort((a, b) => b.current_value - a.current_value).slice(0, 5),
    [holdingsWithPrices],
  );

  const allocationData = useMemo(
    () =>
      summary?.allocation_by_type
        ? Object.entries(summary.allocation_by_type).filter(([_, v]) => v > 0).sort((a, b) => b[1] - a[1])
        : [],
    [summary],
  );

  const totalValue = summary?.total_value ?? 0;
  const dayChange = summary?.day_change ?? 0;
  const dayChangePct = summary?.day_change_percent ?? 0;
  const allTimeGL = summary?.total_gain_loss ?? 0;
  const allTimeGLPct = summary?.total_gain_loss_percent ?? 0;
  const isGainToday = dayChange >= 0;
  const isGainAllTime = allTimeGL >= 0;
  const hasHoldings = holdingsWithPrices.length > 0;

  const firstName = profile?.display_name?.split(' ')[0] || '';

  // Gradient colors for the hero area
  const heroGradient = isDark
    ? ['#0F172A', '#0F172A'] as const
    : ['#FFFFFF', '#F0FDF4'] as const;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* ──── Hero Section ──── */}
      <LinearGradient colors={heroGradient} style={[styles.hero, { paddingTop: insets.top + Spacing.sm }]}>
        {/* Greeting */}
        <Text style={[styles.greeting, { color: colors.textSecondary }]}>
          {getGreeting()}{firstName ? `, ${firstName}` : ''}
        </Text>

        {/* Portfolio Value */}
        <AnimatedCounter
          value={totalValue}
          style={[styles.heroValue, { color: colors.text }]}
          duration={800}
        />

        {/* Day change pill */}
        <View style={styles.changePillRow}>
          <View
            style={[
              styles.changePill,
              {
                backgroundColor: isGainToday
                  ? (isDark ? 'rgba(52,211,153,0.15)' : 'rgba(5,150,105,0.08)')
                  : (isDark ? 'rgba(248,113,113,0.15)' : 'rgba(220,38,38,0.08)'),
              },
            ]}
          >
            <Ionicons
              name={isGainToday ? 'caret-up' : 'caret-down'}
              size={12}
              color={isGainToday ? colors.gain : colors.loss}
            />
            <Text style={[styles.changePillText, { color: isGainToday ? colors.gain : colors.loss }]}>
              {formatCurrency(Math.abs(dayChange))} ({formatPercent(dayChangePct)})
            </Text>
          </View>
          <Text style={[styles.changePillLabel, { color: colors.textTertiary }]}>Today</Text>
        </View>

        {/* All-time row */}
        {hasHoldings && (
          <View style={styles.allTimeRow}>
            <Text style={[styles.allTimeLabel, { color: colors.textTertiary }]}>All-time</Text>
            <View style={styles.allTimeValues}>
              <AnimatedCounter
                value={allTimeGL}
                style={[styles.allTimeAmount, { color: isGainAllTime ? colors.gain : colors.loss }]}
                duration={600}
              />
              <Text style={[styles.allTimePct, { color: isGainAllTime ? colors.gain : colors.loss }]}>
                {' '}
              </Text>
              <PercentCounter
                value={allTimeGLPct}
                style={[styles.allTimePct, { color: isGainAllTime ? colors.gain : colors.loss }]}
                duration={600}
              />
            </View>
          </View>
        )}
      </LinearGradient>

      {/* ──── Quick Actions ──── */}
      <View style={styles.actionsRow}>
        <ActionChip
          icon="add-circle"
          label="Add Asset"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/(tabs)/portfolio');
          }}
          colors={colors}
          primary
        />
        <ActionChip
          icon="sparkles"
          label="AI Advisor"
          badge={!isPremiumPlus ? 'PRO' : undefined}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(isPremiumPlus ? '/ai-chat' : '/paywall');
          }}
          colors={colors}
        />
        <ActionChip
          icon="bar-chart"
          label="Analysis"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/(tabs)/analysis');
          }}
          colors={colors}
        />
      </View>

      {/* ──── Asset Allocation ──── */}
      {allocationData.length > 0 && summary && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Allocation</Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/analysis')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.seeAll, { color: colors.primary }]}>Details</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <AllocationPieChart
              data={summary.allocation_by_type}
              size={width * 0.42}
              showLegend={true}
              centerLabel="Assets"
              centerValue={String(holdingsWithPrices.length)}
            />
          </View>
        </View>
      )}

      {/* ──── Top Holdings ──── */}
      {topHoldings.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Holdings</Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/portfolio')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.holdingsCard, { backgroundColor: colors.card }]}>
            {topHoldings.map((holding, index) => {
              const isLast = index === topHoldings.length - 1;
              const glPct = holding.gain_loss_percent;
              const icon = ASSET_TYPE_ICONS[holding.asset_type] as keyof typeof Ionicons.glyphMap;
              const typeColor = ASSET_TYPE_COLORS[holding.asset_type] || colors.primary;
              return (
                <TouchableOpacity
                  key={holding.id}
                  style={[
                    styles.holdingRow,
                    !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                  ]}
                  activeOpacity={0.6}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/asset/${holding.id}`);
                  }}
                >
                  {/* Icon */}
                  <View style={[styles.holdingIcon, { backgroundColor: typeColor + '12' }]}>
                    <Ionicons name={icon || 'cube'} size={18} color={typeColor} />
                  </View>

                  {/* Info */}
                  <View style={styles.holdingInfo}>
                    <Text style={[styles.holdingName, { color: colors.text }]} numberOfLines={1}>
                      {holding.symbol || holding.name}
                    </Text>
                    <Text style={[styles.holdingType, { color: colors.textTertiary }]}>
                      {ASSET_TYPE_LABELS[holding.asset_type]}
                    </Text>
                  </View>

                  {/* Values */}
                  <View style={styles.holdingValues}>
                    <Text style={[styles.holdingValue, { color: colors.text }]}>
                      {formatCurrency(holding.current_value)}
                    </Text>
                    <View
                      style={[
                        styles.holdingChangePill,
                        {
                          backgroundColor: glPct >= 0
                            ? (isDark ? 'rgba(52,211,153,0.12)' : 'rgba(5,150,105,0.06)')
                            : (isDark ? 'rgba(248,113,113,0.12)' : 'rgba(220,38,38,0.06)'),
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.holdingChangeText,
                          { color: glPct >= 0 ? colors.gain : colors.loss },
                        ]}
                      >
                        {formatPercent(glPct)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* ──── Empty State ──── */}
      {!hasHoldings && !isLoading && (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconBox, { backgroundColor: isDark ? 'rgba(16,185,129,0.1)' : 'rgba(5,150,105,0.06)' }]}>
            <Ionicons name="pie-chart" size={44} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Build Your Portfolio
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Track stocks, crypto, real estate, and more{'\n'}all in one place
          </Text>
          <TouchableOpacity
            style={[styles.emptyCTA, { backgroundColor: colors.primary }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/(tabs)/portfolio');
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={20} color="#FFF" />
            <Text style={styles.emptyCTAText}>Add Your First Asset</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

// ── Action Chip ───────────────────────────────────────────────────────────
function ActionChip({
  icon,
  label,
  onPress,
  colors,
  badge,
  primary,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
  badge?: string;
  primary?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.actionChip,
        {
          backgroundColor: primary ? colors.primary : colors.card,
          borderColor: primary ? colors.primary : colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Ionicons name={icon} size={16} color={primary ? '#FFF' : colors.text} />
      <Text
        style={[
          styles.actionChipLabel,
          { color: primary ? '#FFF' : colors.text },
        ]}
      >
        {label}
      </Text>
      {badge && (
        <View style={[styles.chipBadge, { backgroundColor: primary ? 'rgba(255,255,255,0.25)' : colors.accent }]}>
          <Text style={styles.chipBadgeText}>{badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: Spacing.xxl + 20 },

  // Hero
  hero: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  greeting: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.regular,
    marginBottom: Spacing.xs,
  },
  heroValue: {
    fontSize: 42,
    fontWeight: FontWeight.bold,
    letterSpacing: -1.5,
    fontVariant: ['tabular-nums'],
    marginBottom: Spacing.sm,
  },
  changePillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  changePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  changePillText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    fontVariant: ['tabular-nums'],
  },
  changePillLabel: {
    fontSize: FontSize.sm,
  },

  // All-time
  allTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.15)',
  },
  allTimeLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  allTimeValues: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  allTimeAmount: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    fontVariant: ['tabular-nums'],
  },
  allTimePct: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    fontVariant: ['tabular-nums'],
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  actionChipLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  chipBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: BorderRadius.xs,
    marginLeft: 2,
  },
  chipBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },

  // Sections
  section: {
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.3,
  },
  seeAll: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  sectionCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    ...Shadow.sm,
  },

  // Holdings
  holdingsCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  holdingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    gap: Spacing.sm,
  },
  holdingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdingInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  holdingName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    letterSpacing: -0.2,
  },
  holdingType: {
    fontSize: FontSize.xs,
    marginTop: 1,
  },
  holdingValues: {
    alignItems: 'flex-end',
    gap: 3,
  },
  holdingValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
  holdingChangePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  holdingChangeText: {
    fontSize: 11,
    fontWeight: FontWeight.semibold,
    fontVariant: ['tabular-nums'],
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
  },
  emptyIconBox: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.5,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  emptyCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
    ...Shadow.md,
  },
  emptyCTAText: {
    color: '#FFF',
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
});
