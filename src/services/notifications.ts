// Notifications Service - Local & Push notifications for alerts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { AlertWithHolding } from './alerts';
import { formatCurrency } from '@/utils/formatters';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    console.log('Notifications only work on physical devices');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Notification permissions not granted');
    return false;
  }

  // Configure Android channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('alerts', {
      name: 'Price Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366F1',
      sound: 'default',
    });
  }

  return true;
}

/**
 * Get push notification token (for future server-side push)
 */
export async function getPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });
    return token;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
}

/**
 * Send local notification for a triggered alert
 */
export async function sendAlertNotification(alert: AlertWithHolding, currentPrice: number): Promise<void> {
  const symbol = alert.holding_symbol || alert.holding_name;
  const targetPrice = alert.target_value || 0;

  let title = '';
  let body = '';

  if (alert.alert_type === 'price_above') {
    title = `🚀 ${symbol} Hit Target!`;
    body = `${symbol} is now ${formatCurrency(currentPrice)}, above your target of ${formatCurrency(targetPrice)}`;
  } else if (alert.alert_type === 'price_below') {
    title = `📉 ${symbol} Price Alert`;
    body = `${symbol} dropped to ${formatCurrency(currentPrice)}, below your target of ${formatCurrency(targetPrice)}`;
  } else if (alert.alert_type === 'maturity') {
    title = `📅 ${symbol} Maturity Soon`;
    body = `Your ${symbol} position is approaching maturity date`;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.HIGH,
      data: {
        alertId: alert.id,
        holdingId: alert.holding_id,
        type: 'price_alert',
      },
    },
    trigger: null, // Send immediately
  });
}

/**
 * Schedule a daily reminder notification
 */
export async function scheduleDailyReminder(hour: number = 9, minute: number = 0): Promise<string | null> {
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '📊 Portfolio Check-in',
        body: 'Review your portfolio performance today',
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
    return id;
  } catch (error) {
    console.error('Error scheduling reminder:', error);
    return null;
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Cancel a specific notification
 */
export async function cancelNotification(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id);
}

/**
 * Get badge count
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Set badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear badge
 */
export async function clearBadge(): Promise<void> {
  await setBadgeCount(0);
}

/**
 * Add notification response listener (when user taps notification)
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Add notification received listener (when notification arrives while app is open)
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}
