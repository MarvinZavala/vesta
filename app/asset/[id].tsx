import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button, AnimatedCounter, PercentCounter } from '@/components/ui';
import { AnimatedCardWrapper } from '@/components/ui/AnimatedCard';
import { PriceChart } from '@/components/charts';
import { useTheme } from '@/hooks/useTheme';
import { usePortfolioStore } from '@/store/portfolioStore';
import { formatCurrency, ASSET_TYPE_LABELS, ASSET_TYPE_ICONS } from '@/utils/formatters';
import { FontSize, FontWeight, Spacing, BorderRadius, Brand } from '@/constants/theme';

export default function AssetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { holdingsWithPrices, deleteHolding, updateHolding, fetchHoldings, activePortfolio } = usePortfolioStore();

  const [isDeleting, setIsDeleting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editQuantity, setEditQuantity] = useState('');
  const [editCostBasis, setEditCostBasis] = useState('');
  const [editManualPrice, setEditManualPrice] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Find the holding
  const holding = holdingsWithPrices.find((h) => h.id === id);

  if (!holding) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.notFound}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.textTertiary} />
          <Text style={[styles.notFoundText, { color: colors.textSecondary }]}>
            Asset not found
          </Text>
          <Button title="Go Back" onPress={() => router.back()} variant="outline" />
        </View>
      </SafeAreaView>
    );
  }

  const totalCostBasis = (holding.cost_basis ?? 0) * holding.quantity;
  const gainLossPercent = totalCostBasis > 0
    ? ((holding.current_value - totalCostBasis) / totalCostBasis) * 100
    : 0;
  const isPositive = holding.gain_loss >= 0;

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      'Delete Asset',
      `Are you sure you want to delete "${holding.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteHolding(holding.id);
              router.back();
            } catch (error) {
              console.error('Error deleting holding:', error);
              Alert.alert('Error', 'Failed to delete asset. Please try again.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditQuantity(String(holding.quantity));
    setEditCostBasis(holding.cost_basis ? String(holding.cost_basis) : '');
    setEditManualPrice(holding.manual_price ? String(holding.manual_price) : '');
    setEditNotes(holding.notes || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    const qty = parseFloat(editQuantity);
    if (!qty || qty <= 0) {
      Alert.alert('Invalid', 'Please enter a valid quantity.');
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const pricePerUnit = parseFloat(editCostBasis) || 0;
    const updates: Record<string, any> = {
      quantity: qty,
      cost_basis: pricePerUnit > 0 ? pricePerUnit : null,
      notes: editNotes.trim() || null,
    };

    const manualPrice = parseFloat(editManualPrice);
    if (manualPrice > 0) {
      updates.manual_price = manualPrice;
      updates.manual_price_updated_at = new Date().toISOString();
    }

    const success = await updateHolding(holding.id, updates);
    setIsSaving(false);

    if (success) {
      setShowEditModal(false);
      if (activePortfolio) await fetchHoldings(activePortfolio.id);
    } else {
      Alert.alert('Error', 'Failed to update asset. Please try again.');
    }
  };

  const iconName = ASSET_TYPE_ICONS[holding.asset_type] || 'cube';
  const typeLabel = ASSET_TYPE_LABELS[holding.asset_type] || holding.asset_type;
  const chartSymbol = holding.symbol || (
    holding.asset_type === 'commodity_gold'
      ? 'XAU'
      : holding.asset_type === 'commodity_silver'
      ? 'XAG'
      : holding.asset_type === 'commodity_platinum'
      ? 'XPT'
      : ''
  );
  const isChartableType = ['stock', 'etf', 'mutual_fund', 'crypto', 'commodity_gold', 'commodity_silver', 'commodity_platinum']
    .includes(holding.asset_type);

  return (
    <>
      <Stack.Screen
        options={{
          title: holding.symbol || holding.name,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ padding: Spacing.sm, marginLeft: -Spacing.xs }}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={handleEdit} style={{ padding: Spacing.sm }}>
              <Ionicons name="create-outline" size={24} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        {/* Header Card */}
        <AnimatedCardWrapper index={0}>
          <Card style={styles.headerCard}>
            {/* Performance color bar */}
            <View
              style={{
                height: 4,
                borderRadius: 2,
                backgroundColor: isPositive ? colors.gain : colors.loss,
                marginBottom: Spacing.md,
              }}
            />
            <View style={styles.headerTop}>
              <View style={[styles.assetIcon, { backgroundColor: colors.primaryLight + '20' }]}>
                <Ionicons name={iconName as any} size={28} color={colors.primary} />
              </View>
              <View style={styles.headerInfo}>
                <Text style={[styles.assetName, { color: colors.text }]}>{holding.name}</Text>
                {holding.symbol && (
                  <Text style={[styles.assetSymbol, { color: colors.textSecondary }]}>
                    {holding.symbol}
                  </Text>
                )}
                <View style={[styles.typeBadge, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.typeText, { color: colors.textSecondary }]}>{typeLabel}</Text>
                </View>
              </View>
            </View>

            <View style={[styles.valueSection, { borderTopColor: colors.border }]}>
              <AnimatedCounter
                value={holding.current_value}
                style={[styles.currentValue, { color: colors.text }]}
                duration={800}
              />
              <View style={styles.changeRow}>
                <Ionicons
                  name={isPositive ? 'trending-up' : 'trending-down'}
                  size={20}
                  color={isPositive ? colors.gain : colors.loss}
                />
                <AnimatedCounter
                  value={holding.gain_loss}
                  style={[styles.changeText, { color: isPositive ? colors.gain : colors.loss }]}
                  duration={600}
                  prefix={isPositive ? '+' : ''}
                />
                <Text style={[styles.changeText, { color: isPositive ? colors.gain : colors.loss }]}>
                  {' ('}
                </Text>
                <PercentCounter
                  value={gainLossPercent}
                  style={[styles.changeText, { color: isPositive ? colors.gain : colors.loss }]}
                  duration={600}
                />
                <Text style={[styles.changeText, { color: isPositive ? colors.gain : colors.loss }]}>
                  {')'}
                </Text>
              </View>
            </View>
          </Card>
        </AnimatedCardWrapper>

        {/* Price Chart - only for tradeable assets */}
        {chartSymbol && isChartableType && (
          <AnimatedCardWrapper index={1}>
            <PriceChart
              symbol={chartSymbol}
              assetType={holding.asset_type}
              costBasis={holding.cost_basis ?? undefined}
            />
          </AnimatedCardWrapper>
        )}

        {/* Position Details */}
        <AnimatedCardWrapper index={2}>
          <Card style={styles.detailsCard}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Position Details</Text>

            <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Quantity</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {holding.quantity.toLocaleString(undefined, { maximumFractionDigits: 8 })}
              </Text>
            </View>

            {holding.cost_basis != null && holding.cost_basis > 0 && (
              <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Avg Purchase Price</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {formatCurrency(holding.cost_basis)}
                </Text>
              </View>
            )}

            {holding.current_price > 0 && (
              <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Current Price</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {formatCurrency(holding.current_price)}
                </Text>
              </View>
            )}

            {holding.cost_basis != null && holding.cost_basis > 0 && (
              <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Total Cost Basis</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {formatCurrency(holding.cost_basis * holding.quantity)}
                </Text>
              </View>
            )}

            {holding.purchase_date && (
              <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Purchase Date</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {new Date(holding.purchase_date).toLocaleDateString()}
                </Text>
              </View>
            )}
          </Card>
        </AnimatedCardWrapper>

        {/* Additional Info */}
        {(holding.sector || holding.country || holding.interest_rate != null || holding.maturity_date || holding.property_type || holding.property_address || holding.payment_frequency) && (
          <AnimatedCardWrapper index={3}>
          <Card style={styles.detailsCard}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Additional Information</Text>

            {holding.sector && (
              <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Sector</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{holding.sector}</Text>
              </View>
            )}

            {holding.country && (
              <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Country</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{holding.country}</Text>
              </View>
            )}

            {holding.interest_rate != null && (
              <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Interest Rate</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {holding.interest_rate}%
                </Text>
              </View>
            )}

            {holding.maturity_date && (
              <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Maturity Date</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {new Date(holding.maturity_date).toLocaleDateString()}
                </Text>
              </View>
            )}

            {holding.payment_frequency && (
              <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Payment Frequency</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {holding.payment_frequency.charAt(0).toUpperCase() + holding.payment_frequency.slice(1)}
                </Text>
              </View>
            )}

            {holding.property_type && (
              <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Property Type</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {holding.property_type.charAt(0).toUpperCase() + holding.property_type.slice(1)}
                </Text>
              </View>
            )}

            {holding.property_address && (
              <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Address</Text>
                <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={2}>
                  {holding.property_address}
                </Text>
              </View>
            )}
          </Card>
          </AnimatedCardWrapper>
        )}

        {/* Notes */}
        {holding.notes && (
          <AnimatedCardWrapper index={4}>
            <Card style={styles.detailsCard}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Notes</Text>
              <Text style={[styles.notesText, { color: colors.textSecondary }]}>{holding.notes}</Text>
            </Card>
          </AnimatedCardWrapper>
        )}

        {/* Delete Button */}
        <View style={styles.deleteSection}>
          <Button
            title="Delete Asset"
            onPress={handleDelete}
            variant="outline"
            fullWidth
            loading={isDeleting}
            style={{ borderColor: colors.loss }}
            textStyle={{ color: colors.loss }}
          />
        </View>

        {/* Last Updated */}
        <Text style={[styles.lastUpdated, { color: colors.textTertiary }]}>
          Last updated: {new Date(holding.updated_at).toLocaleString()}
        </Text>
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit {holding.name}</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Quantity</Text>
              <TextInput
                style={[styles.editInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}
                value={editQuantity}
                onChangeText={setEditQuantity}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
              />

              <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Price per Unit ($)</Text>
              <TextInput
                style={[styles.editInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}
                value={editCostBasis}
                onChangeText={setEditCostBasis}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.textTertiary}
              />

              {['real_estate', 'other', 'cash'].includes(holding.asset_type) && (
                <>
                  <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Manual Current Price ($)</Text>
                  <TextInput
                    style={[styles.editInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}
                    value={editManualPrice}
                    onChangeText={setEditManualPrice}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.textTertiary}
                  />
                </>
              )}

              <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Notes</Text>
              <TextInput
                style={[styles.editInput, styles.editTextArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}
                value={editNotes}
                onChangeText={setEditNotes}
                placeholder="Add notes..."
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={3}
              />

              {editQuantity && editCostBasis && (
                <View style={[styles.editSummary, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.editSummaryLabel, { color: colors.textSecondary }]}>Total Cost Basis</Text>
                  <Text style={[styles.editSummaryValue, { color: colors.text }]}>
                    {formatCurrency((parseFloat(editQuantity) || 0) * (parseFloat(editCostBasis) || 0))}
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                title="Save Changes"
                onPress={handleSaveEdit}
                loading={isSaving}
                fullWidth
                size="lg"
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
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
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  notFoundText: {
    fontSize: FontSize.lg,
  },
  headerCard: {
    marginBottom: Spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  assetIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  headerInfo: {
    flex: 1,
  },
  assetName: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    marginBottom: 2,
  },
  assetSymbol: {
    fontSize: FontSize.md,
    marginBottom: Spacing.xs,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  typeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  valueSection: {
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  currentValue: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.xs,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  changeText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  detailsCard: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailLabel: {
    fontSize: FontSize.md,
  },
  detailValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  notesText: {
    fontSize: FontSize.md,
    lineHeight: 22,
  },
  deleteSection: {
    marginTop: Spacing.lg,
  },
  lastUpdated: {
    fontSize: FontSize.xs,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  modalBody: {
    padding: Spacing.lg,
  },
  modalFooter: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  editLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  editInput: {
    fontSize: FontSize.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    minHeight: 48,
  },
  editTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  editSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
  },
  editSummaryLabel: {
    fontSize: FontSize.sm,
  },
  editSummaryValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
});
