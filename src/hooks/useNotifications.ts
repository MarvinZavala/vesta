// Hook for managing notifications in the app
import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import {
  requestNotificationPermissions,
  clearBadge,
} from '@/services/notifications';

export function useNotifications() {
  const router = useRouter();
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  // Request permissions on mount
  const requestPermissions = useCallback(async () => {
    const granted = await requestNotificationPermissions();
    return granted;
  }, []);

  useEffect(() => {
    // Request permissions
    requestPermissions();

    // Clear badge when app opens
    clearBadge();

    // Listen for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
      // Could show an in-app toast here
    });

    // Listen for user tapping on notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;

      if (data?.type === 'price_alert' && data?.alertId) {
        // Navigate to alerts screen
        router.push('/(tabs)/alerts');
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [requestPermissions, router]);

  return {
    requestPermissions,
  };
}
