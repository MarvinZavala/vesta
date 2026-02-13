// Allocation Donut Chart - Pure View implementation (no native dependencies)
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { ASSET_TYPE_LABELS, ASSET_TYPE_COLORS } from '@/utils/formatters';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';

interface AllocationPieChartProps {
  data: Record<string, number>;
  size?: number;
  showLegend?: boolean;
  centerLabel?: string;
  centerValue?: string;
}

export function AllocationPieChart({
  data,
  size,
  showLegend = true,
  centerLabel,
  centerValue,
}: AllocationPieChartProps) {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const chartSize = size || width * 0.55;

  // Transform and sort data
  const chartData = useMemo(() => {
    return Object.entries(data || {})
      .filter(([_, value]) => value > 0)
      .map(([type, value]) => ({
        type,
        value,
        color: ASSET_TYPE_COLORS[type] || colors.primary,
        label: ASSET_TYPE_LABELS[type] || type,
      }))
      .sort((a, b) => b.value - a.value);
  }, [data, colors.primary]);

  if (!chartData.length) {
    return (
      <View style={[styles.empty, { height: chartSize }]}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No data available
        </Text>
      </View>
    );
  }

  const total = chartData.reduce((s, i) => s + i.value, 0);

  return (
    <View style={styles.container}>
      {/* Donut ring using conic gradient simulation with segments */}
      <View style={[styles.chartBox, { width: chartSize, height: chartSize }]}>
        <DonutRing data={chartData} total={total} size={chartSize} colors={colors} />
        {(centerLabel || centerValue) && (
          <View style={styles.center} pointerEvents="none">
            {centerValue && (
              <Text style={[styles.centerVal, { color: colors.text }]}>
                {centerValue}
              </Text>
            )}
            {centerLabel && (
              <Text style={[styles.centerLbl, { color: colors.textSecondary }]}>
                {centerLabel}
              </Text>
            )}
          </View>
        )}
      </View>

      {showLegend && (
        <View style={styles.legend}>
          {chartData.map((item) => (
            <View key={item.type} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: item.color }]} />
              <Text
                style={[styles.legendLabel, { color: colors.text }]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
              <Text style={[styles.legendVal, { color: colors.textSecondary }]}>
                {item.value.toFixed(1)}%
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Horizontal bar breakdown */}
      <View style={styles.barContainer}>
        <View style={[styles.barTrack, { backgroundColor: colors.backgroundTertiary }]}>
          {chartData.map((item, i) => (
            <View
              key={item.type}
              style={[
                styles.barSegment,
                {
                  backgroundColor: item.color,
                  flex: item.value / total,
                  borderTopLeftRadius: i === 0 ? 4 : 0,
                  borderBottomLeftRadius: i === 0 ? 4 : 0,
                  borderTopRightRadius: i === chartData.length - 1 ? 4 : 0,
                  borderBottomRightRadius: i === chartData.length - 1 ? 4 : 0,
                },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

// Pure View donut using overlapping colored quadrants
function DonutRing({
  data,
  total,
  size,
  colors,
}: {
  data: Array<{ type: string; value: number; color: string }>;
  total: number;
  size: number;
  colors: any;
}) {
  const thickness = size * 0.18;
  const innerSize = size - thickness * 2;

  // Build segments as percentage arcs
  let accumulated = 0;
  const segments = data.map((item) => {
    const percent = (item.value / total) * 100;
    const start = accumulated;
    accumulated += percent;
    return { ...item, percent, start };
  });

  // Build conic gradient stops for the ring
  const gradientStops = segments
    .map((seg) => `${seg.color} ${seg.start}% ${seg.start + seg.percent}%`)
    .join(', ');

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Colored ring segments using border trick */}
      {segments.map((seg, i) => {
        const rotation = (seg.start / 100) * 360 - 90;
        const sweep = (seg.percent / 100) * 360;

        // For each segment, create a half-circle and rotate it into position
        if (sweep <= 0) return null;

        return (
          <View
            key={seg.type}
            style={[
              StyleSheet.absoluteFill,
              { alignItems: 'center', justifyContent: 'center' },
            ]}
          >
            <View
              style={{
                position: 'absolute',
                width: size,
                height: size,
                borderRadius: size / 2,
                borderWidth: thickness,
                borderColor: 'transparent',
                borderTopColor: seg.color,
                borderRightColor: sweep > 90 ? seg.color : 'transparent',
                borderBottomColor: sweep > 180 ? seg.color : 'transparent',
                borderLeftColor: sweep > 270 ? seg.color : 'transparent',
                transform: [{ rotate: `${rotation}deg` }],
              }}
            />
          </View>
        );
      })}

      {/* Inner circle to create donut hole */}
      <View
        style={{
          width: innerSize,
          height: innerSize,
          borderRadius: innerSize / 2,
          backgroundColor: colors.card,
          position: 'absolute',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  chartBox: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerVal: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  centerLbl: { fontSize: FontSize.xs, marginTop: 2 },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: Spacing.xs },
  legendLabel: { fontSize: FontSize.xs, marginRight: Spacing.xs, maxWidth: 80 },
  legendVal: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  barContainer: {
    width: '100%',
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  barSegment: {
    height: '100%',
  },
  empty: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: FontSize.sm },
});
