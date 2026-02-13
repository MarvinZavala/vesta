import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Share,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/authStore';
import { usePortfolioStore } from '@/store/portfolioStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { ASSET_TYPE_LABELS } from '@/utils/formatters';
import { FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';
import { requestNotificationPermissions } from '@/services/notifications';

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
];

type RowItem = {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  label: string;
  value?: string;
  onPress: () => void;
  destructive?: boolean;
};

export default function SettingsScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { profile, logout } = useAuthStore();
  const { holdingsWithPrices, summary } = usePortfolioStore();
  const { setPreferredCurrency } = useOnboardingStore();
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const handleExportPortfolio = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (holdingsWithPrices.length === 0) {
      Alert.alert('No Data', 'Add some assets first.');
      return;
    }
    const header = 'Name,Symbol,Type,Quantity,Cost Basis,Current Value,Gain/Loss';
    const rows = holdingsWithPrices.map(h =>
      `"${h.name}","${h.symbol || ''}","${ASSET_TYPE_LABELS[h.asset_type] || h.asset_type}",${h.quantity},${h.cost_basis || 0},${h.current_value.toFixed(2)},${h.gain_loss.toFixed(2)}`,
    );
    const totalRow = `\n"TOTAL","","",,,${summary?.total_value.toFixed(2) || 0},${summary?.total_gain_loss.toFixed(2) || 0}`;
    const csv = [header, ...rows].join('\n') + totalRow;
    try {
      await Share.share({ message: csv, title: 'Vesta Portfolio Export' });
    } catch {
      Alert.alert('Error', 'Failed to export.');
    }
  };

  const handleNotifications = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const granted = await requestNotificationPermissions();
    if (granted) {
      Alert.alert('Enabled', 'You will receive price alerts and updates.');
    } else {
      Alert.alert('Notifications', 'Enable in your device settings for alerts.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]);
    }
  };

  const handleCurrencySelect = (code: string) => {
    setPreferredCurrency(code);
    setShowCurrencyPicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const isFree = profile?.subscription_tier === 'free';
  const tierLabel = profile?.subscription_tier === 'free' ? 'Free' : 'Vesta Pro';

  // ── Section data ──
  const preferencesRows: RowItem[] = [
    { icon: 'globe-outline', iconBg: '#3B82F6', label: 'Currency', value: profile?.preferred_currency || 'USD', onPress: () => setShowCurrencyPicker(true) },
    { icon: 'notifications-outline', iconBg: '#EF4444', label: 'Notifications', onPress: handleNotifications },
    { icon: 'moon-outline', iconBg: '#6366F1', label: 'Appearance', value: 'System', onPress: () => Alert.alert('Appearance', 'Vesta follows your system theme automatically.') },
  ];

  const dataRows: RowItem[] = [
    { icon: 'share-outline', iconBg: '#10B981', label: 'Export Portfolio', onPress: handleExportPortfolio },
    { icon: 'cloud-done-outline', iconBg: '#0EA5E9', label: 'Sync Data', onPress: () => Alert.alert('Sync', 'Your data syncs automatically with the cloud.') },
  ];

  const supportRows: RowItem[] = [
    { icon: 'help-buoy-outline', iconBg: '#F59E0B', label: 'Help Center', onPress: () => Linking.openURL('mailto:support@vestaportfolio.app?subject=Help') },
    { icon: 'chatbubbles-outline', iconBg: '#8B5CF6', label: 'Contact Us', onPress: () => Linking.openURL('mailto:support@vestaportfolio.app') },
  ];

  const legalRows: RowItem[] = [
    { icon: 'document-text-outline', iconBg: '#64748B', label: 'Terms of Service', onPress: () => Linking.openURL('https://vesta.app/terms') },
    { icon: 'shield-checkmark-outline', iconBg: '#64748B', label: 'Privacy Policy', onPress: () => Linking.openURL('https://vesta.app/privacy') },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: isDark ? colors.background : '#F2F2F7' }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Profile ── */}
      <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarLetter}>
            {(profile?.display_name?.[0] || profile?.email?.[0] || 'U').toUpperCase()}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: colors.text }]}>
            {profile?.display_name || 'Vesta User'}
          </Text>
          <Text style={[styles.profileEmail, { color: colors.textTertiary }]}>
            {profile?.email}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </View>

      {/* ── Subscription ── */}
      <TouchableOpacity
        style={[
          styles.subscriptionCard,
          isFree
            ? { backgroundColor: colors.card }
            : { backgroundColor: colors.primary },
        ]}
        onPress={() => router.push('/paywall')}
        activeOpacity={0.75}
      >
        <View style={[styles.subIconBox, { backgroundColor: isFree ? colors.primary + '15' : 'rgba(255,255,255,0.2)' }]}>
          <Ionicons name="diamond" size={20} color={isFree ? colors.primary : '#FFF'} />
        </View>
        <View style={styles.subInfo}>
          <Text style={[styles.subTitle, { color: isFree ? colors.text : '#FFF' }]}>
            {tierLabel} Plan
          </Text>
          <Text style={[styles.subDetail, { color: isFree ? colors.textTertiary : 'rgba(255,255,255,0.7)' }]}>
            {isFree ? 'Upgrade for unlimited assets & AI' : 'Manage subscription'}
          </Text>
        </View>
        <View style={[styles.subArrowBox, { backgroundColor: isFree ? colors.primary + '10' : 'rgba(255,255,255,0.15)' }]}>
          <Ionicons name="chevron-forward" size={16} color={isFree ? colors.primary : '#FFF'} />
        </View>
      </TouchableOpacity>

      {/* ── Sections ── */}
      <SettingsGroup title="PREFERENCES" rows={preferencesRows} colors={colors} isDark={isDark} />
      <SettingsGroup title="DATA" rows={dataRows} colors={colors} isDark={isDark} />
      <SettingsGroup title="SUPPORT" rows={supportRows} colors={colors} isDark={isDark} />
      <SettingsGroup title="LEGAL" rows={legalRows} colors={colors} isDark={isDark} />

      {/* ── Sign Out ── */}
      <View style={[styles.groupCard, { backgroundColor: colors.card }]}>
        <TouchableOpacity style={styles.signOutRow} onPress={handleLogout} activeOpacity={0.6}>
          <View style={[styles.iconSquare, { backgroundColor: isDark ? 'rgba(248,113,113,0.15)' : '#FEE2E2' }]}>
            <Ionicons name="log-out-outline" size={18} color={colors.error} />
          </View>
          <Text style={[styles.signOutLabel, { color: colors.error }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.version, { color: colors.textTertiary }]}>
        Vesta v1.0.0
      </Text>

      {/* ── Currency Modal ── */}
      <Modal visible={showCurrencyPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Currency</Text>
              <TouchableOpacity onPress={() => setShowCurrencyPicker(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={28} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={CURRENCIES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => {
                const selected = (profile?.preferred_currency || 'USD') === item.code;
                return (
                  <TouchableOpacity
                    style={[styles.currencyRow, { borderBottomColor: colors.border }]}
                    onPress={() => handleCurrencySelect(item.code)}
                    activeOpacity={0.6}
                  >
                    <Text style={[styles.currencySymbol, { color: colors.text }]}>{item.symbol}</Text>
                    <View style={styles.currencyInfo}>
                      <Text style={[styles.currencyCode, { color: colors.text }]}>{item.code}</Text>
                      <Text style={[styles.currencyName, { color: colors.textTertiary }]}>{item.name}</Text>
                    </View>
                    {selected && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// ── Grouped settings section (iOS native style) ──────────────────────────
function SettingsGroup({
  title,
  rows,
  colors,
  isDark,
}: {
  title: string;
  rows: RowItem[];
  colors: any;
  isDark: boolean;
}) {
  return (
    <View style={styles.sectionWrap}>
      <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>{title}</Text>
      <View style={[styles.groupCard, { backgroundColor: colors.card }]}>
        {rows.map((row, i) => {
          const isLast = i === rows.length - 1;
          return (
            <TouchableOpacity
              key={row.label}
              style={[
                styles.row,
                !isLast && styles.rowBorder,
                !isLast && { borderBottomColor: colors.border },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                row.onPress();
              }}
              activeOpacity={0.55}
            >
              <View style={[styles.iconSquare, { backgroundColor: row.iconBg }]}>
                <Ionicons name={row.icon} size={17} color="#FFF" />
              </View>
              <Text style={[styles.rowLabel, { color: row.destructive ? colors.error : colors.text }]}>
                {row.label}
              </Text>
              <View style={styles.rowRight}>
                {row.value && (
                  <Text style={[styles.rowValue, { color: colors.textTertiary }]}>{row.value}</Text>
                )}
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxl + 20,
  },

  // Profile
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    gap: 14,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: FontWeight.bold,
  },
  profileInfo: { flex: 1 },
  profileName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.3,
  },
  profileEmail: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },

  // Subscription
  subscriptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: BorderRadius.xl,
    gap: 12,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  subIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subInfo: { flex: 1 },
  subTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.2,
  },
  subDetail: {
    fontSize: FontSize.xs,
    marginTop: 1,
  },
  subArrowBox: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Sections
  sectionWrap: {
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.6,
    marginBottom: 6,
    marginLeft: Spacing.md,
    marginTop: Spacing.md,
  },
  groupCard: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadow.sm,
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginLeft: 0, // Full-width separator — iOS inset style handled by padding
  },
  iconSquare: {
    width: 30,
    height: 30,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.regular,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowValue: {
    fontSize: FontSize.md,
  },

  // Sign out
  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  signOutLabel: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },

  // Version
  version: {
    fontSize: FontSize.xs,
    textAlign: 'center',
    marginTop: Spacing.lg,
    letterSpacing: 0.3,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '55%',
    paddingBottom: Spacing.xxl,
  },
  modalHandle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(128,128,128,0.3)',
    alignSelf: 'center',
    marginTop: Spacing.sm,
  },
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
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  currencySymbol: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    width: 28,
    textAlign: 'center',
  },
  currencyInfo: { flex: 1 },
  currencyCode: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  currencyName: {
    fontSize: FontSize.xs,
    marginTop: 1,
  },
});
