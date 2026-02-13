import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { AddAssetSheet } from '@/components/AddAssetSheet';
import { useTheme } from '@/hooks/useTheme';
import { usePortfolioStore } from '@/store/portfolioStore';
import { useAuthStore } from '@/store/authStore';
import {
  formatCurrency,
  formatPercent,
  formatQuantity,
  ASSET_TYPE_LABELS,
  ASSET_TYPE_COLORS,
  ASSET_TYPE_ICONS,
} from '@/utils/formatters';
import { AssetType, HoldingWithPrice } from '@/types/database';
import { FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';

// Filter config with icons and accent colors
const FILTER_CONFIG: {
  type: AssetType | 'all';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}[] = [
  { type: 'all', label: 'All', icon: 'grid', color: '#059669' },
  { type: 'stock', label: 'Stocks', icon: 'trending-up', color: '#4F46E5' },
  { type: 'etf', label: 'ETFs', icon: 'layers', color: '#7C3AED' },
  { type: 'crypto', label: 'Crypto', icon: 'logo-bitcoin', color: '#F59E0B' },
  { type: 'commodity_gold', label: 'Gold', icon: 'diamond', color: '#EAB308' },
  { type: 'real_estate', label: 'Property', icon: 'home', color: '#F97316' },
  { type: 'fixed_income_bond', label: 'Bonds', icon: 'document-text', color: '#10B981' },
  { type: 'cash', label: 'Cash', icon: 'cash', color: '#22C55E' },
  { type: 'other', label: 'Other', icon: 'cube', color: '#6366F1' },
];

type FilterType = 'all' | AssetType;

// Animated filter chip component
function FilterChip({
  label,
  icon,
  color,
  count,
  isActive,
  onPress,
  isDark,
  colors,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  count: number;
  isActive: boolean;
  onPress: () => void;
  isDark: boolean;
  colors: any;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.filterChip,
        isActive
          ? {
              backgroundColor: isDark ? color + '18' : color + '0F',
              borderColor: isDark ? color + '40' : color + '25',
            }
          : {
              backgroundColor: isDark ? colors.backgroundSecondary : colors.backgroundTertiary,
              borderColor: 'transparent',
            },
      ]}
    >
      {isActive && (
        <Ionicons name={icon} size={13} color={color} style={{ marginRight: 4 }} />
      )}
      <Text
        style={[
          styles.filterChipText,
          {
            color: isActive ? color : colors.textSecondary,
            fontWeight: isActive ? FontWeight.semibold : FontWeight.medium,
          },
        ]}
      >
        {label}
      </Text>
      {count > 0 && isActive && (
        <View style={[styles.filterCount, { backgroundColor: color + '20' }]}>
          <Text style={[styles.filterCountText, { color }]}>{count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function PortfolioScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { profile } = useAuthStore();
  const { holdings, holdingsWithPrices, deleteHolding } = usePortfolioStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [showAddSheet, setShowAddSheet] = useState(false);

  const isFree = profile?.subscription_tier === 'free';
  const holdingsCount = holdings.length;
  const canAddMore = !isFree || holdingsCount < 5;

  // Count holdings per type for badges & smart filtering
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const h of holdingsWithPrices) {
      counts[h.asset_type] = (counts[h.asset_type] || 0) + 1;
    }
    return counts;
  }, [holdingsWithPrices]);

  // Only show filters that have holdings (plus "All" always)
  const visibleFilters = useMemo(() => {
    return FILTER_CONFIG.filter(
      (f) => f.type === 'all' || (typeCounts[f.type] ?? 0) > 0
    );
  }, [typeCounts]);

  const filteredHoldings = holdingsWithPrices.filter((h) => {
    const matchesSearch =
      searchQuery === '' ||
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (h.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesFilter = filter === 'all' || h.asset_type === filter;
    return matchesSearch && matchesFilter;
  });

  const handleAddPress = () => {
    if (!canAddMore) {
      Alert.alert('Free Tier Limit', 'Upgrade to Premium to add unlimited assets.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Upgrade', onPress: () => router.push('/paywall') },
      ]);
      return;
    }
    setShowAddSheet(true);
  };

  const handleAssetPress = (holding: HoldingWithPrice) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/asset/${holding.id}`);
  };

  const handleDeleteHolding = (holding: HoldingWithPrice) => {
    Alert.alert(
      'Delete Asset',
      `Are you sure you want to delete ${holding.symbol || holding.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteHolding(holding.id) },
      ],
    );
  };

  const renderHoldingItem = useCallback(
    ({ item, index }: { item: HoldingWithPrice; index: number }) => {
      const isLast = index === filteredHoldings.length - 1;
      const glPct = item.gain_loss_percent;
      const icon = ASSET_TYPE_ICONS[item.asset_type] as keyof typeof Ionicons.glyphMap;
      const typeColor = ASSET_TYPE_COLORS[item.asset_type] || colors.primary;

      return (
        <TouchableOpacity
          activeOpacity={0.6}
          onPress={() => handleAssetPress(item)}
          onLongPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            handleDeleteHolding(item);
          }}
          delayLongPress={500}
        >
          <View
            style={[
              styles.holdingRow,
              !isLast && {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.border,
              },
            ]}
          >
            {/* Icon */}
            <View style={[styles.holdingIcon, { backgroundColor: typeColor + '12' }]}>
              <Ionicons name={icon || 'cube'} size={18} color={typeColor} />
            </View>

            {/* Info */}
            <View style={styles.holdingInfo}>
              <Text style={[styles.holdingName, { color: colors.text }]} numberOfLines={1}>
                {item.symbol || item.name}
              </Text>
              <Text style={[styles.holdingMeta, { color: colors.textTertiary }]}>
                {formatQuantity(item.quantity)} · {ASSET_TYPE_LABELS[item.asset_type]}
              </Text>
            </View>

            {/* Values */}
            <View style={styles.holdingRight}>
              <Text style={[styles.holdingValue, { color: colors.text }]}>
                {formatCurrency(item.current_value)}
              </Text>
              <View
                style={[
                  styles.holdingChangePill,
                  {
                    backgroundColor:
                      glPct >= 0
                        ? isDark ? 'rgba(52,211,153,0.12)' : 'rgba(5,150,105,0.06)'
                        : isDark ? 'rgba(248,113,113,0.12)' : 'rgba(220,38,38,0.06)',
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
          </View>
        </TouchableOpacity>
      );
    },
    [colors, isDark, filteredHoldings.length],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: isDark ? colors.backgroundSecondary : colors.backgroundTertiary }]}>
          <Ionicons name="search" size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search holdings..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {visibleFilters.map((f) => {
            const active = filter === f.type;
            const count = f.type === 'all'
              ? holdingsWithPrices.length
              : (typeCounts[f.type] ?? 0);

            return (
              <FilterChip
                key={f.type}
                label={f.label}
                icon={f.icon}
                color={isDark
                  ? (f.type === 'all' ? '#34D399' : ASSET_TYPE_COLORS[f.type] || f.color)
                  : f.color}
                count={count}
                isActive={active}
                onPress={() => {
                  Haptics.selectionAsync();
                  setFilter(f.type);
                }}
                isDark={isDark}
                colors={colors}
              />
            );
          })}
        </ScrollView>
      </View>

      {/* Count + Limit */}
      <View style={styles.countRow}>
        <Text style={[styles.countText, { color: colors.textTertiary }]}>
          {filteredHoldings.length} holding{filteredHoldings.length !== 1 ? 's' : ''}
        </Text>
        {isFree && (
          <TouchableOpacity
            onPress={() => router.push('/paywall')}
            style={[styles.limitBadge, { backgroundColor: isDark ? 'rgba(251,191,36,0.1)' : 'rgba(217,119,6,0.06)' }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.limitText, { color: colors.warning }]}>
              {holdingsCount}/5 free
            </Text>
            <Ionicons name="chevron-forward" size={12} color={colors.warning} />
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      <FlatList
        data={filteredHoldings}
        renderItem={renderHoldingItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          filteredHoldings.length > 0 ? (
            <View style={[styles.listCard, { backgroundColor: colors.card, ...Shadow.sm }]} />
          ) : null
        }
        ListHeaderComponentStyle={filteredHoldings.length > 0 ? styles.listCardBg : undefined}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconBox, { backgroundColor: isDark ? 'rgba(16,185,129,0.1)' : 'rgba(5,150,105,0.06)' }]}>
              <Ionicons name={searchQuery ? 'search' : 'wallet'} size={36} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {searchQuery ? 'No Results' : 'No Holdings Yet'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {searchQuery ? 'Try a different search term' : 'Tap + to add your first asset'}
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={handleAddPress}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>

      <AddAssetSheet
        visible={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        onSuccess={() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Search
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 42,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
  },

  // Filters — Coinbase-inspired chips
  filterWrapper: {
    marginTop: Spacing.sm,
    marginBottom: 2,
  },
  filterContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    letterSpacing: -0.1,
  },
  filterCount: {
    marginLeft: 5,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    minWidth: 20,
    alignItems: 'center',
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
    fontVariant: ['tabular-nums'],
  },

  // Count
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  countText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  limitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 2,
  },
  limitText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },

  // List
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  listCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BorderRadius.xl,
  },
  listCardBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // Holding row
  holdingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
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
  holdingMeta: {
    fontSize: FontSize.xs,
    marginTop: 1,
  },
  holdingRight: {
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

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingTop: Spacing.xxl + 20,
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.3,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    textAlign: 'center',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: Spacing.lg,
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.lg,
  },
});
