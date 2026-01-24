import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, SlideInRight } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Card, Button, Input } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { usePortfolioStore } from '@/store/portfolioStore';
import { useAuthStore } from '@/store/authStore';
import {
  formatCurrency,
  formatPercent,
  formatQuantity,
  ASSET_TYPE_LABELS,
  ASSET_TYPE_COLORS,
} from '@/utils/formatters';
import { AssetType, HoldingWithPrice } from '@/types/database';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';

const ASSET_TYPES: { type: AssetType; label: string; icon: string }[] = [
  { type: 'stock', label: 'Stock', icon: 'trending-up' },
  { type: 'etf', label: 'ETF', icon: 'layers' },
  { type: 'crypto', label: 'Crypto', icon: 'logo-bitcoin' },
  { type: 'commodity_gold', label: 'Gold', icon: 'diamond' },
  { type: 'real_estate', label: 'Real Estate', icon: 'home' },
  { type: 'fixed_income_bond', label: 'Bond', icon: 'document-text' },
  { type: 'cash', label: 'Cash', icon: 'cash' },
  { type: 'other', label: 'Other', icon: 'ellipsis-horizontal' },
];

type FilterType = 'all' | AssetType;

export default function PortfolioScreen() {
  const { colors } = useTheme();
  const { profile } = useAuthStore();
  const {
    activePortfolio,
    holdings,
    holdingsWithPrices,
    isLoading,
    addHolding,
    deleteHolding,
    createPortfolio,
  } = usePortfolioStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAssetType, setSelectedAssetType] = useState<AssetType | null>(null);

  // Check free tier limit
  const isFree = profile?.subscription_tier === 'free';
  const holdingsCount = holdings.length;
  const canAddMore = !isFree || holdingsCount < 5;

  // Filter and search holdings
  const filteredHoldings = holdingsWithPrices.filter((holding) => {
    const matchesSearch =
      searchQuery === '' ||
      holding.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (holding.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

    const matchesFilter = filter === 'all' || holding.asset_type === filter;

    return matchesSearch && matchesFilter;
  });

  const handleAddPress = () => {
    if (!canAddMore) {
      Alert.alert(
        'Free Tier Limit',
        'Upgrade to Premium to add unlimited assets.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => {} },
        ]
      );
      return;
    }
    setShowAddModal(true);
  };

  const handleDeleteHolding = (holding: HoldingWithPrice) => {
    Alert.alert(
      'Delete Asset',
      `Are you sure you want to delete ${holding.symbol || holding.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteHolding(holding.id),
        },
      ]
    );
  };

  const renderHoldingItem = useCallback(
    ({ item, index }: { item: HoldingWithPrice; index: number }) => (
      <Animated.View entering={SlideInRight.delay(index * 50).duration(300)}>
        <TouchableOpacity
          activeOpacity={0.7}
          onLongPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            handleDeleteHolding(item);
          }}
        >
          <Card style={styles.holdingCard}>
            <View style={styles.holdingRow}>
              <View style={styles.holdingLeft}>
                <View
                  style={[
                    styles.holdingIcon,
                    {
                      backgroundColor:
                        (ASSET_TYPE_COLORS[item.asset_type] || colors.primary) + '20',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.holdingSymbolText,
                      { color: ASSET_TYPE_COLORS[item.asset_type] || colors.primary },
                    ]}
                  >
                    {(item.symbol || item.name).slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.holdingInfo}>
                  <Text style={[styles.holdingName, { color: colors.text }]}>
                    {item.symbol || item.name}
                  </Text>
                  <Text style={[styles.holdingMeta, { color: colors.textSecondary }]}>
                    {formatQuantity(item.quantity)} · {ASSET_TYPE_LABELS[item.asset_type]}
                  </Text>
                </View>
              </View>
              <View style={styles.holdingRight}>
                <Text style={[styles.holdingValue, { color: colors.text }]}>
                  {formatCurrency(item.current_value)}
                </Text>
                <Text
                  style={[
                    styles.holdingChange,
                    { color: item.gain_loss_percent >= 0 ? colors.gain : colors.loss },
                  ]}
                >
                  {formatPercent(item.gain_loss_percent)}
                </Text>
              </View>
            </View>
          </Card>
        </TouchableOpacity>
      </Animated.View>
    ),
    [colors]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
          ]}
        >
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search assets..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContainer}
      >
        <FilterChip
          label="All"
          active={filter === 'all'}
          onPress={() => setFilter('all')}
          colors={colors}
        />
        {ASSET_TYPES.slice(0, 6).map((asset) => (
          <FilterChip
            key={asset.type}
            label={asset.label}
            active={filter === asset.type}
            onPress={() => setFilter(asset.type)}
            colors={colors}
          />
        ))}
      </ScrollView>

      {/* Holdings Count */}
      <View style={styles.countRow}>
        <Text style={[styles.countText, { color: colors.textSecondary }]}>
          {filteredHoldings.length} asset{filteredHoldings.length !== 1 ? 's' : ''}
          {isFree && ` (${holdingsCount}/5 free)`}
        </Text>
      </View>

      {/* Holdings List */}
      <FlatList
        data={filteredHoldings}
        renderItem={renderHoldingItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="briefcase-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No Assets Found
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {searchQuery ? 'Try a different search' : 'Add your first asset to get started'}
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={handleAddPress}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Add Asset Modal */}
      <AddAssetModal
        visible={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setSelectedAssetType(null);
        }}
        selectedType={selectedAssetType}
        onSelectType={setSelectedAssetType}
        onAdd={async (data) => {
          if (!activePortfolio) {
            // Create default portfolio if none exists
            await createPortfolio('My Portfolio');
          }
          const portfolioId = usePortfolioStore.getState().activePortfolio?.id;
          if (portfolioId) {
            await addHolding({
              portfolio_id: portfolioId,
              ...data,
            });
          }
          setShowAddModal(false);
          setSelectedAssetType(null);
        }}
        colors={colors}
      />
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
  colors,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <TouchableOpacity
      style={[
        styles.filterChip,
        {
          backgroundColor: active ? colors.primary : colors.backgroundSecondary,
          borderColor: active ? colors.primary : colors.border,
        },
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.filterChipText,
          { color: active ? '#FFFFFF' : colors.textSecondary },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function AddAssetModal({
  visible,
  onClose,
  selectedType,
  onSelectType,
  onAdd,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  selectedType: AssetType | null;
  onSelectType: (type: AssetType) => void;
  onAdd: (data: any) => Promise<void>;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [costBasis, setCostBasis] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setSymbol('');
    setName('');
    setQuantity('');
    setCostBasis('');
  };

  const handleSubmit = async () => {
    if (!selectedType || !name || !quantity) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAdd({
        asset_type: selectedType,
        symbol: symbol || null,
        name,
        quantity: parseFloat(quantity),
        cost_basis: costBasis ? parseFloat(costBasis) : null,
        currency: 'USD',
        country: 'US',
      });
      resetForm();
    } catch (error) {
      Alert.alert('Error', 'Failed to add asset');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.modalContainer, { backgroundColor: colors.background }]}
      >
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Add Asset</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView style={styles.modalContent}>
          {!selectedType ? (
            <>
              <Text style={[styles.stepTitle, { color: colors.text }]}>
                What type of asset?
              </Text>
              <View style={styles.assetTypeGrid}>
                {ASSET_TYPES.map((asset) => (
                  <TouchableOpacity
                    key={asset.type}
                    style={[
                      styles.assetTypeCard,
                      { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onSelectType(asset.type);
                    }}
                  >
                    <Ionicons
                      name={asset.icon as any}
                      size={28}
                      color={colors.primary}
                    />
                    <Text style={[styles.assetTypeLabel, { color: colors.text }]}>
                      {asset.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : (
            <Animated.View entering={FadeIn.duration(300)}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => onSelectType(null as any)}
              >
                <Ionicons name="arrow-back" size={20} color={colors.primary} />
                <Text style={[styles.backText, { color: colors.primary }]}>
                  Change type
                </Text>
              </TouchableOpacity>

              <Text style={[styles.stepTitle, { color: colors.text }]}>
                Add {ASSET_TYPE_LABELS[selectedType]}
              </Text>

              {['stock', 'etf', 'crypto', 'mutual_fund'].includes(selectedType) && (
                <Input
                  label="Symbol"
                  placeholder="e.g., AAPL, BTC"
                  value={symbol}
                  onChangeText={setSymbol}
                  autoCapitalize="characters"
                />
              )}

              <Input
                label="Name *"
                placeholder="e.g., Apple Inc., Bitcoin"
                value={name}
                onChangeText={setName}
              />

              <Input
                label="Quantity *"
                placeholder="e.g., 10"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="decimal-pad"
              />

              <Input
                label="Cost Basis (per unit)"
                placeholder="e.g., 150.00"
                value={costBasis}
                onChangeText={setCostBasis}
                keyboardType="decimal-pad"
                hint="Optional - used to calculate gains/losses"
              />

              <Button
                title="Add Asset"
                onPress={handleSubmit}
                loading={isSubmitting}
                fullWidth
                size="lg"
                style={{ marginTop: Spacing.lg }}
              />
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    paddingVertical: Spacing.xs,
  },
  filterScroll: {
    maxHeight: 50,
    marginTop: Spacing.sm,
  },
  filterContainer: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  countRow: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  countText: {
    fontSize: FontSize.sm,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 100,
  },
  holdingCard: {
    marginBottom: Spacing.sm,
  },
  holdingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  holdingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  holdingIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdingSymbolText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  holdingInfo: {
    flex: 1,
  },
  holdingName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  holdingMeta: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  holdingRight: {
    alignItems: 'flex-end',
  },
  holdingValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  holdingChange: {
    fontSize: FontSize.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.lg,
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  stepTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.lg,
  },
  assetTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  assetTypeCard: {
    width: '47%',
    aspectRatio: 1.2,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  assetTypeLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  backText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
});
