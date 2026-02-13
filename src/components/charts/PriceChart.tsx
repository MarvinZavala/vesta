import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CartesianChart, Area, Line, useChartPressState } from 'victory-native';
import { LinearGradient, vec, Circle, useFont } from '@shopify/react-native-skia';
import { useTheme } from '@/hooks/useTheme';
import { fetchPriceHistory, PricePoint } from '@/services/prices';
import { AssetType } from '@/types/database';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import type { SharedValue } from 'react-native-reanimated';

const TIME_PERIODS = [
  { label: '1D', days: 1 },
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '1Y', days: 365 },
  { label: 'ALL', days: 'max' as const },
];

// Asset types that have API price history
const CHARTABLE_TYPES: AssetType[] = [
  'stock',
  'etf',
  'mutual_fund',
  'crypto',
  'commodity_gold',
  'commodity_silver',
  'commodity_platinum',
];

interface PriceChartProps {
  symbol: string;
  assetType: AssetType;
  costBasis?: number;
}

function ToolTip({ x, y, color }: { x: SharedValue<number>; y: SharedValue<number>; color: string }) {
  return (
    <>
      <Circle cx={x} cy={y} r={6} color={color} />
      <Circle cx={x} cy={y} r={3} color="white" />
    </>
  );
}

export function PriceChart({ symbol, assetType, costBasis }: PriceChartProps) {
  const { colors, isDark } = useTheme();
  const [data, setData] = useState<PricePoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(2); // Default 1M
  const { state, isActive } = useChartPressState({ x: 0, y: { price: 0 } });

  // Don't render for non-chartable types
  if (!CHARTABLE_TYPES.includes(assetType)) return null;

  const loadData = useCallback(async (days: number | 'max') => {
    setIsLoading(true);
    const history = await fetchPriceHistory(symbol, assetType, days);
    setData(history);
    setIsLoading(false);
  }, [symbol, assetType]);

  useEffect(() => {
    const period = TIME_PERIODS[selectedPeriod];
    loadData(period.days);
  }, [selectedPeriod, loadData]);

  // Determine gain/loss color
  const lastPrice = data.length > 0 ? data[data.length - 1].price : 0;
  const firstPrice = data.length > 0 ? data[0].price : 0;
  const isGain = lastPrice >= firstPrice;
  const chartColor = isGain ? colors.gain : colors.loss;
  const gradientEnd = isGain
    ? (isDark ? '#059669' + '15' : '#059669' + '20')
    : (isDark ? '#DC2626' + '15' : '#DC2626' + '20');

  // Format chart data
  const chartData = data.map((p, i) => ({
    x: i,
    price: p.price,
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      {/* Active tooltip value */}
      {isActive && data.length > 0 && (
        <View style={styles.tooltipRow}>
          <Text style={[styles.tooltipPrice, { color: colors.text }]}>
            ${state.y.price.value.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>
      )}

      {/* Chart */}
      <View style={styles.chartWrapper}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textTertiary }]}>Loading chart...</Text>
          </View>
        ) : chartData.length < 2 ? (
          <View style={styles.loadingContainer}>
            <Ionicons name="analytics-outline" size={28} color={colors.textTertiary} />
            <Text style={[styles.loadingText, { color: colors.textTertiary }]}>
              Chart data unavailable for this period
            </Text>
          </View>
        ) : (
          <CartesianChart
            data={chartData}
            xKey="x"
            yKeys={['price']}
            chartPressState={state}
            padding={{ left: 0, right: 0, top: 10, bottom: 0 }}
          >
            {({ points, chartBounds }) => (
              <>
                <Area
                  points={points.price}
                  y0={chartBounds.bottom}
                  animate={{ type: 'timing', duration: 500 }}
                  curveType="natural"
                >
                  <LinearGradient
                    start={vec(0, chartBounds.top)}
                    end={vec(0, chartBounds.bottom)}
                    colors={[chartColor + '60', gradientEnd]}
                  />
                </Area>
                <Line
                  points={points.price}
                  color={chartColor}
                  strokeWidth={2}
                  animate={{ type: 'timing', duration: 500 }}
                  curveType="natural"
                />
                {isActive && (
                  <ToolTip
                    x={state.x.position}
                    y={state.y.price.position}
                    color={chartColor}
                  />
                )}
              </>
            )}
          </CartesianChart>
        )}
      </View>

      {/* Time period selector */}
      <View style={styles.periodRow}>
        {TIME_PERIODS.map((period, index) => {
          const isSelected = index === selectedPeriod;
          return (
            <Pressable
              key={period.label}
              onPress={() => setSelectedPeriod(index)}
              style={[
                styles.periodPill,
                {
                  backgroundColor: isSelected ? chartColor + '20' : 'transparent',
                },
              ]}
            >
              <Text
                style={[
                  styles.periodText,
                  {
                    color: isSelected ? chartColor : colors.textTertiary,
                    fontWeight: isSelected ? FontWeight.semibold : FontWeight.regular,
                  },
                ]}
              >
                {period.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    paddingTop: Spacing.md,
  },
  tooltipRow: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
  },
  tooltipPrice: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  chartWrapper: {
    height: 200,
    paddingHorizontal: Spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  loadingText: {
    fontSize: FontSize.sm,
  },
  periodRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  periodPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
  },
  periodText: {
    fontSize: FontSize.sm,
  },
});
