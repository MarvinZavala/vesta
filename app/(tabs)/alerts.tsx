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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Button, Input } from '@/components/ui';
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
import { AlertType } from '@/types/database';

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
  ) => {
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
      return;
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
    } else {
      Alert.alert('Error', 'Failed to create alert');
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
function CreateAlertModal({
  visible,
  onClose,
  holdings,
  onCreateAlert,
  colors,
  isDark,
}: {
  visible: boolean;
  onClose: () => void;
  holdings: any[];
  onCreateAlert: (id: string, name: string, sym: string | null, type: AlertType, val: number) => void;
  colors: any;
  isDark: boolean;
}) {
  const [selectedHolding, setSelectedHolding] = useState<any>(null);
  const [alertType, setAlertType] = useState<'price_above' | 'price_below'>('price_above');
  const [targetValue, setTargetValue] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!selectedHolding || !targetValue) return;
    setIsCreating(true);
    await onCreateAlert(selectedHolding.id, selectedHolding.name, selectedHolding.symbol, alertType, parseFloat(targetValue));
    setIsCreating(false);
    setSelectedHolding(null);
    setTargetValue('');
    setAlertType('price_above');
  };

  const handleClose = () => {
    setSelectedHolding(null);
    setTargetValue('');
    setAlertType('price_above');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>New Alert</Text>
          <View style={{ width: 28 }} />
        </View>

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
              {holdings.map((h: any, i: number) => {
                const selected = selectedHolding?.id === h.id;
                const isLast = i === holdings.length - 1;
                return (
                  <TouchableOpacity
                    key={h.id}
                    style={[
                      styles.holdingSelectRow,
                      selected && { backgroundColor: isDark ? 'rgba(16,185,129,0.08)' : 'rgba(5,150,105,0.04)' },
                      !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                    ]}
                    onPress={() => setSelectedHolding(h)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.holdingSymbolText, { color: colors.text }]}>
                        {h.symbol || h.name}
                      </Text>
                      <Text style={[styles.holdingPriceText, { color: colors.textTertiary }]}>
                        {formatCurrency(h.current_price)}
                      </Text>
                    </View>
                    {selected && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {selectedHolding && (
            <>
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
              <View style={[styles.priceInputRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.currencySign, { color: colors.textSecondary }]}>$</Text>
                <Input
                  placeholder="0.00"
                  value={targetValue}
                  onChangeText={setTargetValue}
                  keyboardType="decimal-pad"
                  style={styles.priceInput}
                />
              </View>
              <Text style={[styles.currentHint, { color: colors.textTertiary }]}>
                Current: {formatCurrency(selectedHolding.current_price)}
              </Text>

              <Button
                title={isCreating ? 'Creating...' : 'Create Alert'}
                onPress={handleCreate}
                fullWidth
                size="lg"
                disabled={!targetValue || isCreating}
                style={{ marginTop: Spacing.xl }}
              />
            </>
          )}
        </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
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
  holdingPriceText: {
    fontSize: FontSize.sm,
    marginTop: 1,
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

  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingLeft: Spacing.md,
  },
  currencySign: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.medium,
  },
  priceInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  currentHint: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },
});
