import React, { useState, useCallback } from 'react';
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

const FILTER_TYPES: { type: AssetType | 'all'; label: string }[] = [
  { type: 'all', label: 'All' },
  { type: 'stock', label: 'Stocks' },
  { type: 'etf', label: 'ETFs' },
  { type: 'crypto', label: 'Crypto' },
  { type: 'commodity_gold', label: 'Gold' },
  { type: 'real_estate', label: 'Property' },
  { type: 'fixed_income_bond', label: 'Bonds' },
  { type: 'cash', label: 'Cash' },
  { type: 'other', label: 'Other' },
];

type FilterType = 'all' | AssetType;

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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {FILTER_TYPES.map((f) => {
          const active = filter === f.type;
          return (
            <TouchableOpacity
              key={f.type}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active ? colors.primary : 'transparent',
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setFilter(f.type);
              }}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: active ? '#FFF' : colors.textSecondary },
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Count */}
      <View style={styles.countRow}>
        <Text style={[styles.countText, { color: colors.textTertiary }]}>
          {filteredHoldings.length} holding{filteredHoldings.length !== 1 ? 's' : ''}
        </Text>
        {isFree && (
          <Text style={[styles.countLimit, { color: colors.textTertiary }]}>
            {holdingsCount}/5 free
          </Text>
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

  // Filters
  filterScroll: {
    maxHeight: 44,
    marginTop: Spacing.sm,
  },
  filterContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  filterChipText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },

  // Count
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  countText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  countLimit: {
    fontSize: FontSize.sm,
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
