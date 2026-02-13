import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { Button } from '@/components/ui';
import { AllocationPieChart } from '@/components/charts';
import { useTheme } from '@/hooks/useTheme';
import { usePortfolioStore } from '@/store/portfolioStore';
import { useAuthStore } from '@/store/authStore';
import {
  ASSET_TYPE_COLORS,
  SECTOR_COLORS,
} from '@/utils/formatters';
import { FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';

export default function AnalysisScreen() {
  const { width } = useWindowDimensions();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { profile } = useAuthStore();
  const { summary, holdingsWithPrices } = usePortfolioStore();

  const isPremium = profile?.subscription_tier !== 'free';
  const isPremiumPlus = profile?.subscription_tier !== 'free';

  const assetTypeData = summary?.allocation_by_type
    ? Object.entries(summary.allocation_by_type).filter(([_, v]) => v > 0).sort((a, b) => b[1] - a[1])
    : [];

  const sectorData = summary?.allocation_by_sector
    ? Object.entries(summary.allocation_by_sector).filter(([_, v]) => v > 0).sort((a, b) => b[1] - a[1])
    : [];

  const countryData = summary?.allocation_by_country
    ? Object.entries(summary.allocation_by_country).filter(([_, v]) => v > 0).sort((a, b) => b[1] - a[1])
    : [];

  const calculateRiskScore = () => {
    if (assetTypeData.length === 0) return 0;
    const topAssetPercent = assetTypeData[0]?.[1] || 0;
    const diversificationScore = Math.min(100, assetTypeData.length * 15);
    const concentrationPenalty = Math.max(0, topAssetPercent - 40);
    return Math.round(Math.max(0, Math.min(100, 50 + concentrationPenalty - diversificationScore / 2)));
  };

  const riskScore = calculateRiskScore();

  const getRiskInfo = (score: number) => {
    if (score < 30) return { label: 'Low Risk', color: colors.gain, bg: isDark ? 'rgba(52,211,153,0.12)' : 'rgba(5,150,105,0.06)' };
    if (score < 60) return { label: 'Moderate', color: colors.warning, bg: isDark ? 'rgba(251,191,36,0.12)' : 'rgba(217,119,6,0.06)' };
    return { label: 'High Risk', color: colors.loss, bg: isDark ? 'rgba(248,113,113,0.12)' : 'rgba(220,38,38,0.06)' };
  };

  const riskInfo = getRiskInfo(riskScore);

  // Animated bar
  function AnimatedBar({ percent, color, delay: d }: { percent: number; color: string; delay: number }) {
    const barWidth = useSharedValue(0);
    useEffect(() => {
      barWidth.value = withDelay(d, withTiming(percent, { duration: 600 }));
    }, [percent]);
    const style = useAnimatedStyle(() => ({
      width: `${barWidth.value}%` as any,
      backgroundColor: color,
    }));
    return (
      <View style={[styles.barBg, { backgroundColor: isDark ? colors.backgroundTertiary : colors.backgroundSecondary }]}>
        <Animated.View style={[styles.barFill, style]} />
      </View>
    );
  }

  // Empty state
  if (holdingsWithPrices.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconBox, { backgroundColor: isDark ? 'rgba(16,185,129,0.1)' : 'rgba(5,150,105,0.06)' }]}>
            <Ionicons name="bar-chart" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No Data to Analyze
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Add assets to see portfolio insights{'\n'}and diversification analysis
          </Text>
          <TouchableOpacity
            style={[styles.emptyCTA, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(tabs)/portfolio')}
            activeOpacity={0.85}
          >
            <Text style={styles.emptyCTAText}>Add Assets</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Risk Score */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Risk Score</Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.riskTop}>
            <View style={[styles.riskBadge, { backgroundColor: riskInfo.bg }]}>
              <Text style={[styles.riskScoreNum, { color: riskInfo.color }]}>{riskScore}</Text>
            </View>
            <View style={styles.riskInfo}>
              <Text style={[styles.riskLabel, { color: riskInfo.color }]}>{riskInfo.label}</Text>
              <Text style={[styles.riskHint, { color: colors.textTertiary }]}>
                Based on concentration & diversity
              </Text>
            </View>
          </View>

          {/* Meter */}
          <View style={styles.meterContainer}>
            <View style={[styles.meterBg, { backgroundColor: isDark ? colors.backgroundTertiary : colors.backgroundSecondary }]}>
              <View style={[styles.meterFill, { width: `${riskScore}%`, backgroundColor: riskInfo.color }]} />
            </View>
            <View style={styles.meterLabels}>
              <Text style={[styles.meterLabelText, { color: colors.textTertiary }]}>Low</Text>
              <Text style={[styles.meterLabelText, { color: colors.textTertiary }]}>High</Text>
            </View>
          </View>

          {/* AI upsell */}
          {!isPremiumPlus && (
            <TouchableOpacity
              style={[styles.upsellRow, { backgroundColor: isDark ? 'rgba(16,185,129,0.08)' : 'rgba(5,150,105,0.04)' }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/paywall'); }}
              activeOpacity={0.7}
            >
              <Ionicons name="sparkles" size={16} color={colors.primary} />
              <Text style={[styles.upsellText, { color: colors.primary }]}>Get AI-powered risk analysis</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Asset Allocation */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Asset Allocation</Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {summary && (
            <AllocationPieChart
              data={summary.allocation_by_type}
              size={width * 0.5}
              showLegend={true}
              centerLabel="Assets"
              centerValue={String(holdingsWithPrices.length)}
            />
          )}
        </View>
      </View>

      {/* Sector Breakdown */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Sectors</Text>
          {!isPremium && (
            <View style={[styles.proBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          )}
        </View>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {isPremium ? (
            sectorData.length > 0 ? (
              <View style={styles.barList}>
                {sectorData.slice(0, 6).map(([sector, pct], i) => (
                  <View key={sector} style={styles.barItem}>
                    <View style={styles.barHeader}>
                      <View style={[styles.barDot, { backgroundColor: SECTOR_COLORS[sector] || colors.primary }]} />
                      <Text style={[styles.barLabel, { color: colors.text }]}>{sector}</Text>
                      <Text style={[styles.barPct, { color: colors.textSecondary }]}>{pct.toFixed(1)}%</Text>
                    </View>
                    <AnimatedBar percent={pct} color={SECTOR_COLORS[sector] || colors.primary} delay={i * 80} />
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.noDataText, { color: colors.textTertiary }]}>
                Add sector info to your assets to see breakdown
              </Text>
            )
          ) : (
            <LockedContent
              text="Upgrade to see sector analysis"
              onPress={() => router.push('/paywall')}
              colors={colors}
              isDark={isDark}
            />
          )}
        </View>
      </View>

      {/* Geographic */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Geography</Text>
          {!isPremium && (
            <View style={[styles.proBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          )}
        </View>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {isPremium ? (
            countryData.length > 0 ? (
              <View style={styles.barList}>
                {countryData.slice(0, 5).map(([country, pct], i) => (
                  <View key={country} style={styles.barItem}>
                    <View style={styles.barHeader}>
                      <Text style={styles.flag}>
                        {country === 'US' ? '🇺🇸' : country === 'UK' ? '🇬🇧' : country === 'JP' ? '🇯🇵' : country === 'CN' ? '🇨🇳' : country === 'DE' ? '🇩🇪' : country === 'Global' ? '🌐' : '🌍'}
                      </Text>
                      <Text style={[styles.barLabel, { color: colors.text }]}>{country}</Text>
                      <Text style={[styles.barPct, { color: colors.textSecondary }]}>{pct.toFixed(1)}%</Text>
                    </View>
                    <AnimatedBar percent={pct} color={colors.primary} delay={i * 80} />
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.noDataText, { color: colors.textTertiary }]}>
                Add country info to see geographic exposure
              </Text>
            )
          ) : (
            <LockedContent
              text="Upgrade to see geographic analysis"
              onPress={() => router.push('/paywall')}
              colors={colors}
              isDark={isDark}
            />
          )}
        </View>
      </View>

      {/* AI CTA */}
      <TouchableOpacity
        style={[styles.aiCard, { backgroundColor: colors.primary }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(isPremiumPlus ? '/ai-chat' : '/paywall');
        }}
        activeOpacity={0.85}
      >
        <Ionicons name="sparkles" size={28} color="#FFF" />
        <View style={styles.aiText}>
          <Text style={styles.aiTitle}>AI Portfolio Advisor</Text>
          <Text style={styles.aiSubtitle}>
            {isPremiumPlus
              ? 'Get personalized insights'
              : 'Upgrade for AI-powered analysis'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.6)" />
      </TouchableOpacity>
    </ScrollView>
  );
}

function LockedContent({
  text,
  onPress,
  colors,
  isDark,
}: {
  text: string;
  onPress: () => void;
  colors: any;
  isDark: boolean;
}) {
  return (
    <View style={styles.lockedContent}>
      <View style={[styles.lockedIconBox, { backgroundColor: isDark ? 'rgba(100,116,139,0.12)' : 'rgba(148,163,184,0.1)' }]}>
        <Ionicons name="lock-closed" size={22} color={colors.textTertiary} />
      </View>
      <Text style={[styles.lockedText, { color: colors.textSecondary }]}>{text}</Text>
      <TouchableOpacity
        style={[styles.lockedBtn, { backgroundColor: colors.primary }]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <Text style={styles.lockedBtnText}>Upgrade</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxl + 20,
  },

  // Sections
  section: { marginBottom: Spacing.lg },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.3,
    marginBottom: Spacing.sm,
  },
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    ...Shadow.sm,
  },

  // Risk
  riskTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  riskBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  riskScoreNum: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  riskInfo: { flex: 1 },
  riskLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  riskHint: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  meterContainer: { marginBottom: Spacing.sm },
  meterBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: 4,
  },
  meterLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  meterLabelText: { fontSize: 10 },

  upsellRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
    gap: 6,
  },
  upsellText: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },

  // Bars
  barList: { gap: Spacing.md },
  barItem: { gap: 6 },
  barHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  barDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  flag: {
    fontSize: 14,
    marginRight: Spacing.sm,
  },
  barLabel: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  barPct: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    fontVariant: ['tabular-nums'],
  },
  barBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  noDataText: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },

  // PRO badge
  proBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    marginBottom: Spacing.sm,
  },
  proBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },

  // Locked
  lockedContent: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  lockedIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  lockedText: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  lockedBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  lockedBtnText: {
    color: '#FFF',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },

  // AI CTA
  aiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    gap: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadow.md,
  },
  aiText: { flex: 1 },
  aiTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#FFF',
  },
  aiSubtitle: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },

  // Empty
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl * 2,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
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
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
    ...Shadow.md,
  },
  emptyCTAText: {
    color: '#FFF',
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
});
