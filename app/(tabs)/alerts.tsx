import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/ui';
import { AlertItemSkeleton } from '@/components/ui/Skeleton';
import { useTheme } from '@/hooks/useTheme';
import { usePortfolioStore } from '@/store/portfolioStore';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';
import { TIER_LIMITS } from '@/services/revenuecat';
import {
  AlertWithHolding,
  getAlerts,
  createAlert,
  toggleAlertActive,
  deleteAlert,
  getActiveAlertsCount,
} from '@/services/alerts';
import { AlertType, HoldingWithPrice } from '@/types/database';

export default function AlertsScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { holdingsWithPrices } = usePortfolioStore();
  const { profile } = useAuthStore();

  const [alerts, setAlerts] = useState<AlertWithHolding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchAlerts = useCallback(async () => {
    try {
      const data = await getAlerts();
      setAlerts(data);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchAlerts();
  }, [fetchAlerts]);

  const handleToggleAlert = async (alertId: string, currentState: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAlerts(prev => prev.map(a => (a.id === alertId ? { ...a, is_active: !currentState } : a)));
    const success = await toggleAlertActive(alertId, !currentState);
    if (!success) {
      setAlerts(prev => prev.map(a => (a.id === alertId ? { ...a, is_active: currentState } : a)));
      Alert.alert('Error', 'Failed to update alert');
    }
  };

  const handleDeleteAlert = (alertId: string) => {
    Alert.alert('Delete Alert', 'Are you sure you want to delete this alert?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          const success = await deleteAlert(alertId);
          if (success) setAlerts(prev => prev.filter(a => a.id !== alertId));
          else Alert.alert('Error', 'Failed to delete alert');
        },
      },
    ]);
  };

  const handleCreateAlert = async (
    holdingId: string,
    holdingName: string,
    holdingSymbol: string | null,
    alertType: AlertType,
    targetValue: number,
  ): Promise<boolean> => {
    const subscriptionTier = profile?.subscription_tier || 'free';
    const limits = TIER_LIMITS[subscriptionTier];
    const activeCount = await getActiveAlertsCount();

    if (activeCount >= limits.maxAlerts) {
      Alert.alert(
        'Alert Limit Reached',
        `You can have up to ${limits.maxAlerts} active alerts on the ${subscriptionTier} plan.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/paywall') },
        ],
      );
      return false;
    }

    const newAlert = await createAlert({
      holding_id: holdingId,
      alert_type: alertType,
      target_value: targetValue,
    });

    if (newAlert) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAlerts(prev => [
        { ...newAlert, holding_name: holdingName, holding_symbol: holdingSymbol, current_price: 0 },
        ...prev,
      ]);
      setShowCreateModal(false);
      return true;
    } else {
      Alert.alert('Error', 'Failed to create alert');
      return false;
    }
  };

  const activeAlerts = alerts.filter(a => a.is_active);
  const inactiveAlerts = alerts.filter(a => !a.is_active);

  const getAlertIcon = (type: string): keyof typeof Ionicons.glyphMap =>
    type === 'maturity' ? 'calendar' : type === 'price_above' ? 'arrow-up-circle' : 'arrow-down-circle';

  const getAlertColor = (type: string) =>
    type === 'maturity' ? colors.warning : type === 'price_above' ? colors.gain : colors.loss;

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.skeletonContent}>
          {[0, 1, 2, 3].map(i => <AlertItemSkeleton key={i} />)}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {alerts.length === 0 ? (
          /* ──── Empty State ──── */
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconBox, { backgroundColor: isDark ? 'rgba(16,185,129,0.1)' : 'rgba(5,150,105,0.06)' }]}>
              <Ionicons name="notifications" size={40} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Price Alerts
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Get notified when your assets{'\n'}hit target prices
            </Text>

            {/* Tip */}
            <View style={[styles.tipCard, { backgroundColor: isDark ? 'rgba(251,191,36,0.08)' : 'rgba(217,119,6,0.04)' }]}>
              <Ionicons name="bulb" size={20} color={colors.warning} />
              <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                Set alerts for key price levels to automate your trading decisions
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.emptyCTA, { backgroundColor: colors.primary }]}
              onPress={() => setShowCreateModal(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={20} color="#FFF" />
              <Text style={styles.emptyCTAText}>Create First Alert</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* ──── Alert List ──── */
          <>
            {activeAlerts.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
                  ACTIVE · {activeAlerts.length}
                </Text>
                <View style={[styles.groupCard, { backgroundColor: colors.card }]}>
                  {activeAlerts.map((alert, i) => {
                    const isLast = i === activeAlerts.length - 1;
                    const aColor = getAlertColor(alert.alert_type);
                    return (
                      <TouchableOpacity
                        key={alert.id}
                        onLongPress={() => handleDeleteAlert(alert.id)}
                        delayLongPress={500}
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.alertRow,
                            !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                          ]}
                        >
                          <View style={[styles.alertIconBox, { backgroundColor: aColor + '12' }]}>
                            <Ionicons name={getAlertIcon(alert.alert_type)} size={18} color={aColor} />
                          </View>
                          <View style={styles.alertInfo}>
                            <Text style={[styles.alertTitle, { color: colors.text }]}>
                              {alert.holding_symbol || alert.holding_name}
                            </Text>
                            <Text style={[styles.alertSub, { color: colors.textTertiary }]}>
                              {alert.alert_type === 'price_above'
                                ? `Above ${formatCurrency(alert.target_value || 0)}`
                                : alert.alert_type === 'price_below'
                                ? `Below ${formatCurrency(alert.target_value || 0)}`
                                : `Matures ${formatDate(alert.target_date!)}`}
                            </Text>
                          </View>
                          <Switch
                            value={alert.is_active}
                            onValueChange={() => handleToggleAlert(alert.id, alert.is_active)}
                            trackColor={{ false: colors.backgroundTertiary, true: colors.primary }}
                          />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {inactiveAlerts.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
                  PAUSED · {inactiveAlerts.length}
                </Text>
                <View style={[styles.groupCard, { backgroundColor: colors.card }]}>
                  {inactiveAlerts.map((alert, i) => {
                    const isLast = i === inactiveAlerts.length - 1;
                    const aColor = getAlertColor(alert.alert_type);
                    return (
                      <TouchableOpacity
                        key={alert.id}
                        onLongPress={() => handleDeleteAlert(alert.id)}
                        delayLongPress={500}
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.alertRow,
                            !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                          ]}
                        >
                          <View style={[styles.alertIconBox, { backgroundColor: aColor + '12' }]}>
                            <Ionicons name={getAlertIcon(alert.alert_type)} size={18} color={aColor} />
                          </View>
                          <View style={styles.alertInfo}>
                            <Text style={[styles.alertTitle, { color: colors.text }]}>
                              {alert.holding_symbol || alert.holding_name}
                            </Text>
                            <Text style={[styles.alertSub, { color: colors.textTertiary }]}>
                              {alert.alert_type === 'price_above'
                                ? `Above ${formatCurrency(alert.target_value || 0)}`
                                : alert.alert_type === 'price_below'
                                ? `Below ${formatCurrency(alert.target_value || 0)}`
                                : `Matures ${formatDate(alert.target_date!)}`}
                            </Text>
                          </View>
                          <Switch
                            value={alert.is_active}
                            onValueChange={() => handleToggleAlert(alert.id, alert.is_active)}
                            trackColor={{ false: colors.backgroundTertiary, true: colors.primary }}
                          />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <Text style={[styles.hintText, { color: colors.textTertiary }]}>
              Long press to delete an alert
            </Text>
          </>
        )}
      </ScrollView>

      {/* FAB */}
      {alerts.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color="#FFF" />
        </TouchableOpacity>
      )}

      <CreateAlertModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        holdings={holdingsWithPrices}
        onCreateAlert={handleCreateAlert}
        colors={colors}
        isDark={isDark}
      />
    </View>
  );
}

// ── Create Alert Modal ────────────────────────────────────────────────────
type CreateAlertModalProps = {
  visible: boolean;
  onClose: () => void;
  holdings: HoldingWithPrice[];
  onCreateAlert: (
    id: string,
    name: string,
    sym: string | null,
    type: AlertType,
    val: number
  ) => Promise<boolean> | boolean;
  colors: any;
  isDark: boolean;
};

function CreateAlertModal({
  visible,
  onClose,
  holdings,
  onCreateAlert,
  colors,
  isDark,
}: CreateAlertModalProps) {
  const [step, setStep] = useState<'select' | 'configure'>('select');
  const [selectedHolding, setSelectedHolding] = useState<HoldingWithPrice | null>(null);
  const [alertType, setAlertType] = useState<'price_above' | 'price_below'>('price_above');
  const [targetValue, setTargetValue] = useState('');
  const [targetValueError, setTargetValueError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const resetModalState = useCallback(() => {
    setStep('select');
    setSelectedHolding(null);
    setAlertType('price_above');
    setTargetValue('');
    setTargetValueError(null);
    setIsCreating(false);
  }, []);

  useEffect(() => {
    if (!visible) {
      resetModalState();
    }
  }, [visible, resetModalState]);

  const handleSelectHolding = (holding: HoldingWithPrice) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedHolding(holding);
    setTargetValue('');
    setTargetValueError(null);
    setAlertType('price_above');
    setStep('configure');
  };

  const handleCreate = async () => {
    if (!selectedHolding) return;

    const parsedTarget = parseFloat(targetValue.replace(/,/g, ''));
    if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      setTargetValueError('Enter a valid target price');
      return;
    }

    setTargetValueError(null);
    setIsCreating(true);
    const created = await onCreateAlert(
      selectedHolding.id,
      selectedHolding.name,
      selectedHolding.symbol,
      alertType,
      parsedTarget
    );
    setIsCreating(false);

    if (created) {
      resetModalState();
    }
  };

  const handleClose = () => {
    resetModalState();
    onClose();
  };

  const currentPrice = selectedHolding?.current_price ?? 0;
  const quickUpTarget = currentPrice > 0 ? currentPrice * 1.03 : 0;
  const quickDownTarget = currentPrice > 0 ? currentPrice * 0.97 : 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            onPress={step === 'configure' ? () => setStep('select') : handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={step === 'configure' ? 'chevron-back' : 'close'}
              size={28}
              color={colors.text}
            />
          </TouchableOpacity>
          <View style={styles.modalTitleWrap}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {step === 'select' ? 'New Alert' : 'Configure Alert'}
            </Text>
            <Text style={[styles.modalSubTitle, { color: colors.textTertiary }]}>
              {step === 'select'
                ? 'Choose an asset to continue'
                : (selectedHolding?.symbol || selectedHolding?.name || '')}
            </Text>
          </View>
          <View style={{ width: 28 }} />
        </View>

        <KeyboardAvoidingView
          style={styles.modalBodyContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {step === 'select' ? (
            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <Text style={[styles.stepLabel, { color: colors.textTertiary }]}>SELECT ASSET</Text>

              {holdings.length === 0 ? (
                <View style={[styles.noAssetsCard, { backgroundColor: colors.card }]}>
                  <Text style={[styles.noAssetsText, { color: colors.textSecondary }]}>
                    Add assets to your portfolio first
                  </Text>
                </View>
              ) : (
                <View style={[styles.holdingsList, { backgroundColor: colors.card }]}>
                  {holdings.map((h, i) => {
                    const isLast = i === holdings.length - 1;
                    return (
                      <TouchableOpacity
                        key={h.id}
                        style={[
                          styles.holdingSelectRow,
                          !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                        ]}
                        onPress={() => handleSelectHolding(h)}
                        activeOpacity={0.7}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.holdingSymbolText, { color: colors.text }]}>
                            {h.symbol || h.name}
                          </Text>
                          <Text style={[styles.holdingNameText, { color: colors.textSecondary }]} numberOfLines={1}>
                            {h.name}
                          </Text>
                          <Text style={[styles.holdingPriceText, { color: colors.textTertiary }]}>
                            Current: {formatCurrency(h.current_price)}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          ) : (
            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              {!!selectedHolding && (
                <>
                  <View style={[styles.selectedAssetCard, { backgroundColor: colors.card }]}>
                    <View
                      style={[
                        styles.selectedAssetIcon,
                        { backgroundColor: isDark ? 'rgba(16,185,129,0.14)' : 'rgba(5,150,105,0.08)' },
                      ]}
                    >
                      <Ionicons name="notifications" size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.selectedAssetTitle, { color: colors.text }]}>
                        {selectedHolding.symbol || selectedHolding.name}
                      </Text>
                      <Text style={[styles.selectedAssetSubtitle, { color: colors.textSecondary }]}>
                        {selectedHolding.name}
                      </Text>
                    </View>
                    <Text style={[styles.selectedAssetPrice, { color: colors.text }]}>
                      {formatCurrency(selectedHolding.current_price)}
                    </Text>
                  </View>

              <Text style={[styles.stepLabel, { color: colors.textTertiary, marginTop: Spacing.xl }]}>ALERT TYPE</Text>
              <View style={styles.alertTypeRow}>
                {(['price_above', 'price_below'] as const).map(t => {
                  const active = alertType === t;
                  const c = t === 'price_above' ? colors.gain : colors.loss;
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.alertTypeBtn,
                        {
                          backgroundColor: active ? c + '12' : colors.card,
                          borderColor: active ? c : colors.border,
                        },
                      ]}
                      onPress={() => setAlertType(t)}
                    >
                      <Ionicons name={t === 'price_above' ? 'arrow-up-circle' : 'arrow-down-circle'} size={22} color={active ? c : colors.textSecondary} />
                      <Text style={[styles.alertTypeBtnText, { color: active ? c : colors.text }]}>
                        {t === 'price_above' ? 'Price Above' : 'Price Below'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.stepLabel, { color: colors.textTertiary, marginTop: Spacing.lg }]}>TARGET PRICE</Text>
              <View
                style={[
                  styles.targetInputWrap,
                  {
                    backgroundColor: colors.card,
                    borderColor: targetValueError ? colors.error : colors.border,
                  },
                ]}
              >
                <Text style={[styles.currencySign, { color: colors.textSecondary }]}>$</Text>
                <TextInput
                  style={[styles.targetInput, { color: colors.text }]}
                  placeholder="0.00"
                  placeholderTextColor={colors.textTertiary}
                  value={targetValue}
                  onChangeText={(value) => {
                    setTargetValue(value);
                    if (targetValueError) setTargetValueError(null);
                  }}
                  keyboardType="decimal-pad"
                  autoFocus
                />
              </View>
              {!!targetValueError && (
                <Text style={[styles.targetError, { color: colors.error }]}>{targetValueError}</Text>
              )}

              {currentPrice > 0 && (
                <View style={styles.quickTargetsRow}>
                  <TouchableOpacity
                    style={[styles.quickTargetChip, { backgroundColor: colors.backgroundSecondary }]}
                    onPress={() => setTargetValue(quickUpTarget.toFixed(2))}
                  >
                    <Text style={[styles.quickTargetText, { color: colors.gain }]}>+3% ({formatCurrency(quickUpTarget)})</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.quickTargetChip, { backgroundColor: colors.backgroundSecondary }]}
                    onPress={() => setTargetValue(quickDownTarget.toFixed(2))}
                  >
                    <Text style={[styles.quickTargetText, { color: colors.loss }]}>-3% ({formatCurrency(quickDownTarget)})</Text>
                  </TouchableOpacity>
                </View>
              )}

              <Text style={[styles.currentHint, { color: colors.textTertiary }]}>
                Current: {formatCurrency(selectedHolding.current_price)}
              </Text>

              <Button
                title={isCreating ? 'Creating...' : 'Create Alert'}
                onPress={handleCreate}
                fullWidth
                size="lg"
                disabled={!targetValue || isCreating}
                style={styles.createButton}
              />
                </>
              )}
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: 100,
  },
  skeletonContent: { padding: Spacing.lg },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
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
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.xl,
    width: '100%',
  },
  tipText: {
    flex: 1,
    fontSize: FontSize.sm,
    lineHeight: 20,
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

  // Sections
  section: { marginBottom: Spacing.lg },
  sectionLabel: {
    fontSize: 11,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },

  // Group card
  groupCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  alertIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertInfo: { flex: 1 },
  alertTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    letterSpacing: -0.2,
  },
  alertSub: {
    fontSize: FontSize.xs,
    marginTop: 1,
  },
  hintText: {
    fontSize: FontSize.xs,
    textAlign: 'center',
    marginTop: Spacing.sm,
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

  // Modal
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  modalTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  modalSubTitle: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  modalBodyContainer: { flex: 1 },
  modalScroll: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  noAssetsCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  noAssetsText: { fontSize: FontSize.md },

  holdingsList: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  holdingSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  holdingSymbolText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  holdingNameText: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  holdingPriceText: {
    fontSize: FontSize.sm,
    marginTop: 4,
  },
  selectedAssetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  selectedAssetIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedAssetTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  selectedAssetSubtitle: {
    fontSize: FontSize.sm,
    marginTop: 1,
  },
  selectedAssetPrice: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },

  alertTypeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  alertTypeBtn: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  alertTypeBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },

  targetInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingLeft: Spacing.md,
    minHeight: 52,
  },
  currencySign: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.medium,
  },
  targetInput: {
    flex: 1,
    fontSize: FontSize.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  targetError: {
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
  },
  quickTargetsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  quickTargetChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.sm,
  },
  quickTargetText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  currentHint: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },
  createButton: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
});
