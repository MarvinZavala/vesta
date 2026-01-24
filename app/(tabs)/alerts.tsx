import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Switch,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Card, Button, Input } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { usePortfolioStore } from '@/store/portfolioStore';
import { formatCurrency, formatDate, ASSET_TYPE_LABELS } from '@/utils/formatters';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';

// Mock alerts for demo
interface AlertItem {
  id: string;
  type: 'price_above' | 'price_below' | 'maturity';
  holdingName: string;
  holdingSymbol: string;
  targetValue: number;
  targetDate?: string;
  isActive: boolean;
  createdAt: string;
}

const MOCK_ALERTS: AlertItem[] = [];

export default function AlertsScreen() {
  const { colors } = useTheme();
  const { holdingsWithPrices } = usePortfolioStore();
  const [alerts, setAlerts] = useState<AlertItem[]>(MOCK_ALERTS);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const toggleAlert = (id: string) => {
    setAlerts(alerts.map(alert =>
      alert.id === id ? { ...alert, isActive: !alert.isActive } : alert
    ));
  };

  const deleteAlert = (id: string) => {
    setAlerts(alerts.filter(alert => alert.id !== id));
  };

  const activeAlerts = alerts.filter(a => a.isActive);
  const inactiveAlerts = alerts.filter(a => !a.isActive);

  const renderAlert = (alert: AlertItem) => (
    <Card key={alert.id} style={styles.alertCard}>
      <View style={styles.alertRow}>
        <View style={styles.alertLeft}>
          <View
            style={[
              styles.alertIcon,
              {
                backgroundColor:
                  alert.type === 'maturity'
                    ? colors.warning + '20'
                    : alert.type === 'price_above'
                    ? colors.gain + '20'
                    : colors.loss + '20',
              },
            ]}
          >
            <Ionicons
              name={
                alert.type === 'maturity'
                  ? 'calendar-outline'
                  : alert.type === 'price_above'
                  ? 'trending-up'
                  : 'trending-down'
              }
              size={20}
              color={
                alert.type === 'maturity'
                  ? colors.warning
                  : alert.type === 'price_above'
                  ? colors.gain
                  : colors.loss
              }
            />
          </View>
          <View style={styles.alertInfo}>
            <Text style={[styles.alertTitle, { color: colors.text }]}>
              {alert.holdingSymbol || alert.holdingName}
            </Text>
            <Text style={[styles.alertSubtitle, { color: colors.textSecondary }]}>
              {alert.type === 'price_above'
                ? `Above ${formatCurrency(alert.targetValue)}`
                : alert.type === 'price_below'
                ? `Below ${formatCurrency(alert.targetValue)}`
                : `Matures ${formatDate(alert.targetDate!)}`}
            </Text>
          </View>
        </View>
        <Switch
          value={alert.isActive}
          onValueChange={() => toggleAlert(alert.id)}
          trackColor={{ false: colors.backgroundTertiary, true: colors.primary }}
        />
      </View>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {alerts.length === 0 ? (
          <Animated.View
            entering={FadeInDown.duration(600)}
            style={styles.emptyContainer}
          >
            <Ionicons
              name="notifications-off-outline"
              size={64}
              color={colors.textTertiary}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No Alerts Yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Create price alerts to get notified when your assets hit your target
            </Text>

            <Card style={styles.tipCard} padding="lg">
              <View style={styles.tipRow}>
                <Ionicons name="bulb-outline" size={24} color={colors.warning} />
                <View style={styles.tipText}>
                  <Text style={[styles.tipTitle, { color: colors.text }]}>
                    Pro Tip
                  </Text>
                  <Text style={[styles.tipSubtitle, { color: colors.textSecondary }]}>
                    Set maturity alerts for bonds and CDs to never miss a payment date
                  </Text>
                </View>
              </View>
            </Card>

            <Button
              title="Create Your First Alert"
              onPress={() => setShowCreateModal(true)}
              fullWidth
              size="lg"
              style={{ marginTop: Spacing.lg }}
            />
          </Animated.View>
        ) : (
          <>
            {activeAlerts.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Active Alerts ({activeAlerts.length})
                </Text>
                {activeAlerts.map(renderAlert)}
              </View>
            )}

            {inactiveAlerts.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  Paused ({inactiveAlerts.length})
                </Text>
                {inactiveAlerts.map(renderAlert)}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* FAB */}
      {alerts.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Create Alert Modal */}
      <CreateAlertModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        holdings={holdingsWithPrices}
        onCreateAlert={(alert) => {
          setAlerts([...alerts, { ...alert, id: Date.now().toString(), isActive: true, createdAt: new Date().toISOString() }]);
          setShowCreateModal(false);
        }}
        colors={colors}
      />
    </View>
  );
}

function CreateAlertModal({
  visible,
  onClose,
  holdings,
  onCreateAlert,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  holdings: any[];
  onCreateAlert: (alert: Omit<AlertItem, 'id' | 'isActive' | 'createdAt'>) => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const [selectedHolding, setSelectedHolding] = useState<any>(null);
  const [alertType, setAlertType] = useState<'price_above' | 'price_below' | 'maturity'>('price_above');
  const [targetValue, setTargetValue] = useState('');

  const handleCreate = () => {
    if (!selectedHolding || !targetValue) return;

    onCreateAlert({
      type: alertType,
      holdingName: selectedHolding.name,
      holdingSymbol: selectedHolding.symbol,
      targetValue: parseFloat(targetValue),
    });

    setSelectedHolding(null);
    setTargetValue('');
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Create Alert</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView style={styles.modalContent}>
          <Text style={[styles.stepTitle, { color: colors.text }]}>
            Select Asset
          </Text>

          {holdings.length === 0 ? (
            <Card padding="lg">
              <Text style={[styles.noAssetsText, { color: colors.textSecondary }]}>
                Add assets to your portfolio first to create alerts
              </Text>
            </Card>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.holdingChips}>
                {holdings.map((holding) => (
                  <TouchableOpacity
                    key={holding.id}
                    style={[
                      styles.holdingChip,
                      {
                        backgroundColor:
                          selectedHolding?.id === holding.id
                            ? colors.primary
                            : colors.backgroundSecondary,
                        borderColor:
                          selectedHolding?.id === holding.id
                            ? colors.primary
                            : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedHolding(holding)}
                  >
                    <Text
                      style={[
                        styles.holdingChipText,
                        {
                          color:
                            selectedHolding?.id === holding.id
                              ? '#FFFFFF'
                              : colors.text,
                        },
                      ]}
                    >
                      {holding.symbol || holding.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}

          {selectedHolding && (
            <Animated.View entering={FadeInDown.duration(300)}>
              <Text style={[styles.stepTitle, { color: colors.text, marginTop: Spacing.lg }]}>
                Alert Type
              </Text>

              <View style={styles.alertTypeOptions}>
                <TouchableOpacity
                  style={[
                    styles.alertTypeOption,
                    {
                      backgroundColor:
                        alertType === 'price_above'
                          ? colors.gain + '20'
                          : colors.backgroundSecondary,
                      borderColor:
                        alertType === 'price_above' ? colors.gain : colors.border,
                    },
                  ]}
                  onPress={() => setAlertType('price_above')}
                >
                  <Ionicons
                    name="trending-up"
                    size={24}
                    color={alertType === 'price_above' ? colors.gain : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.alertTypeText,
                      {
                        color:
                          alertType === 'price_above' ? colors.gain : colors.text,
                      },
                    ]}
                  >
                    Price Above
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.alertTypeOption,
                    {
                      backgroundColor:
                        alertType === 'price_below'
                          ? colors.loss + '20'
                          : colors.backgroundSecondary,
                      borderColor:
                        alertType === 'price_below' ? colors.loss : colors.border,
                    },
                  ]}
                  onPress={() => setAlertType('price_below')}
                >
                  <Ionicons
                    name="trending-down"
                    size={24}
                    color={alertType === 'price_below' ? colors.loss : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.alertTypeText,
                      {
                        color:
                          alertType === 'price_below' ? colors.loss : colors.text,
                      },
                    ]}
                  >
                    Price Below
                  </Text>
                </TouchableOpacity>
              </View>

              <Input
                label="Target Price"
                placeholder="e.g., 200.00"
                value={targetValue}
                onChangeText={setTargetValue}
                keyboardType="decimal-pad"
                leftIcon="cash-outline"
              />

              <Text style={[styles.currentPrice, { color: colors.textSecondary }]}>
                Current price: {formatCurrency(selectedHolding.current_price)}
              </Text>

              <Button
                title="Create Alert"
                onPress={handleCreate}
                fullWidth
                size="lg"
                disabled={!targetValue}
                style={{ marginTop: Spacing.lg }}
              />
            </Animated.View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    textAlign: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  tipCard: {
    marginTop: Spacing.xl,
    width: '100%',
  },
  tipRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  tipText: {
    flex: 1,
  },
  tipTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  tipSubtitle: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.sm,
  },
  alertCard: {
    marginBottom: Spacing.sm,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  alertLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertInfo: {
    flex: 1,
  },
  alertTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  alertSubtitle: {
    fontSize: FontSize.sm,
    marginTop: 2,
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
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.md,
  },
  noAssetsText: {
    fontSize: FontSize.md,
    textAlign: 'center',
  },
  holdingChips: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  holdingChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  holdingChipText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  alertTypeOptions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  alertTypeOption: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  alertTypeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  currentPrice: {
    fontSize: FontSize.sm,
    marginTop: -Spacing.sm,
  },
});
