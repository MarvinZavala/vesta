import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Card } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/authStore';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { profile, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  const subscriptionLabel = {
    free: 'Free',
    premium: 'Premium',
    premium_plus: 'Premium+',
  }[profile?.subscription_tier || 'free'];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Profile Card */}
      <Animated.View entering={FadeInDown.duration(600)}>
        <Card style={styles.profileCard} padding="lg">
          <View style={styles.profileRow}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: colors.primary },
              ]}
            >
              <Text style={styles.avatarText}>
                {(profile?.email?.[0] || 'U').toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: colors.text }]}>
                {profile?.display_name || 'Vesta User'}
              </Text>
              <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
                {profile?.email}
              </Text>
            </View>
          </View>
        </Card>
      </Animated.View>

      {/* Subscription Card */}
      <Animated.View entering={FadeInDown.delay(100).duration(600)}>
        <Card
          style={[
            styles.subscriptionCard,
            profile?.subscription_tier !== 'free' && {
              backgroundColor: colors.primary,
            },
          ]}
          padding="lg"
          onPress={() => router.push('/paywall')}
        >
          <View style={styles.subscriptionRow}>
            <View style={styles.subscriptionLeft}>
              <Ionicons
                name="diamond-outline"
                size={24}
                color={profile?.subscription_tier !== 'free' ? '#FFFFFF' : colors.primary}
              />
              <View>
                <Text
                  style={[
                    styles.subscriptionTitle,
                    {
                      color:
                        profile?.subscription_tier !== 'free'
                          ? '#FFFFFF'
                          : colors.text,
                    },
                  ]}
                >
                  {subscriptionLabel}
                </Text>
                <Text
                  style={[
                    styles.subscriptionSubtitle,
                    {
                      color:
                        profile?.subscription_tier !== 'free'
                          ? 'rgba(255,255,255,0.8)'
                          : colors.textSecondary,
                    },
                  ]}
                >
                  {profile?.subscription_tier === 'free'
                    ? 'Upgrade for unlimited features'
                    : 'Manage your subscription'}
                </Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={
                profile?.subscription_tier !== 'free' ? '#FFFFFF' : colors.textSecondary
              }
            />
          </View>
        </Card>
      </Animated.View>

      {/* Settings Sections */}
      <Animated.View entering={FadeInDown.delay(200).duration(600)}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          PREFERENCES
        </Text>
        <Card>
          <SettingsItem
            icon="cash-outline"
            label="Currency"
            value={profile?.preferred_currency || 'USD'}
            onPress={() => Alert.alert('Coming Soon', 'Currency selection coming soon')}
            colors={colors}
          />
          <SettingsItem
            icon="notifications-outline"
            label="Notifications"
            onPress={() => Alert.alert('Coming Soon', 'Notification settings coming soon')}
            colors={colors}
            showBorder
          />
          <SettingsItem
            icon="moon-outline"
            label="Appearance"
            value="System"
            onPress={() => Alert.alert('Info', 'App follows your system theme')}
            colors={colors}
            showBorder
          />
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(300).duration(600)}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          DATA
        </Text>
        <Card>
          <SettingsItem
            icon="download-outline"
            label="Export Portfolio"
            onPress={() => Alert.alert('Coming Soon', 'Export to CSV coming soon')}
            colors={colors}
          />
          <SettingsItem
            icon="refresh-outline"
            label="Sync Data"
            onPress={() => Alert.alert('Info', 'Data syncs automatically')}
            colors={colors}
            showBorder
          />
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(400).duration(600)}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          SUPPORT
        </Text>
        <Card>
          <SettingsItem
            icon="help-circle-outline"
            label="Help & FAQ"
            onPress={() => Linking.openURL('https://vesta.app/help')}
            colors={colors}
          />
          <SettingsItem
            icon="chatbubble-outline"
            label="Contact Support"
            onPress={() => Linking.openURL('mailto:support@vesta.app')}
            colors={colors}
            showBorder
          />
          <SettingsItem
            icon="star-outline"
            label="Rate Vesta"
            onPress={() => Alert.alert('Thank You!', 'Rating coming soon')}
            colors={colors}
            showBorder
          />
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(500).duration(600)}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          LEGAL
        </Text>
        <Card>
          <SettingsItem
            icon="document-text-outline"
            label="Terms of Service"
            onPress={() => Linking.openURL('https://vesta.app/terms')}
            colors={colors}
          />
          <SettingsItem
            icon="shield-outline"
            label="Privacy Policy"
            onPress={() => Linking.openURL('https://vesta.app/privacy')}
            colors={colors}
            showBorder
          />
        </Card>
      </Animated.View>

      {/* Sign Out */}
      <Animated.View entering={FadeInDown.delay(600).duration(600)}>
        <TouchableOpacity
          style={[styles.signOutButton, { borderColor: colors.error }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={[styles.signOutText, { color: colors.error }]}>
            Sign Out
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Version */}
      <Text style={[styles.version, { color: colors.textTertiary }]}>
        Vesta v1.0.0
      </Text>
    </ScrollView>
  );
}

function SettingsItem({
  icon,
  label,
  value,
  onPress,
  colors,
  showBorder,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
  showBorder?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.settingsItem,
        showBorder && { borderTopWidth: 1, borderTopColor: colors.border },
      ]}
      onPress={onPress}
    >
      <View style={styles.settingsItemLeft}>
        <Ionicons name={icon} size={22} color={colors.textSecondary} />
        <Text style={[styles.settingsItemLabel, { color: colors.text }]}>
          {label}
        </Text>
      </View>
      <View style={styles.settingsItemRight}>
        {value && (
          <Text style={[styles.settingsItemValue, { color: colors.textSecondary }]}>
            {value}
          </Text>
        )}
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </View>
    </TouchableOpacity>
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
  profileCard: {
    marginBottom: Spacing.md,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  profileEmail: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  subscriptionCard: {
    marginBottom: Spacing.lg,
  },
  subscriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subscriptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  subscriptionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  subscriptionSubtitle: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
    letterSpacing: 0.5,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  settingsItemLabel: {
    fontSize: FontSize.md,
  },
  settingsItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  settingsItemValue: {
    fontSize: FontSize.sm,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
  },
  signOutText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  version: {
    fontSize: FontSize.xs,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
});
