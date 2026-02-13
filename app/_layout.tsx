import { useEffect, useRef } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useNotifications } from '@/hooks/useNotifications';
import { Colors } from '@/constants/theme';
import { initializeRevenueCat } from '@/services/revenuecat';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(onboarding)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function useProtectedRoute() {
  const { session, isInitialized, isAuthenticating } = useAuthStore();
  const { hasSeenOnboarding, authIntention } = useOnboardingStore();
  const segments = useSegments();
  const router = useRouter();
  const isNavigating = useRef(false);

  useEffect(() => {
    if (!isInitialized) return;
    // Don't navigate while an auth action is in progress
    if (isAuthenticating) return;
    // Prevent double navigation during transition
    if (isNavigating.current) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';

    const navigate = (route: string) => {
      isNavigating.current = true;
      router.replace(route as any);
      // Reset after navigation settles
      setTimeout(() => { isNavigating.current = false; }, 500);
    };

    if (!hasSeenOnboarding && !inOnboardingGroup) {
      navigate('/(onboarding)');
      return;
    }

    if (hasSeenOnboarding) {
      if (inOnboardingGroup) {
        if (session) {
          navigate('/(tabs)');
        } else if (authIntention === 'sign-in') {
          navigate('/(auth)/sign-in');
        } else {
          navigate('/(auth)/sign-up');
        }
      } else if (!session && !inAuthGroup) {
        navigate('/(auth)/welcome');
      } else if (session && inAuthGroup) {
        navigate('/(tabs)');
      }
    }
  }, [session, isInitialized, isAuthenticating, hasSeenOnboarding, segments]);
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { initialize, isInitialized } = useAuthStore();

  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    // Initialize RevenueCat SDK FIRST so it's ready when authStore syncs subscription
    const boot = async () => {
      await initializeRevenueCat();
      initialize();
    };
    boot();
  }, []);

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  useEffect(() => {
    if (fontsLoaded && isInitialized) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isInitialized]);

  if (!fontsLoaded || !isInitialized) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  // Initialize notifications
  useNotifications();

  useProtectedRoute();

  const navigationTheme = {
    ...(colorScheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(colorScheme === 'dark' ? DarkTheme : DefaultTheme).colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="paywall"
          options={{
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Upgrade to Premium',
          }}
        />
        <Stack.Screen
          name="ai-chat"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen name="+not-found" />
      </Stack>
    </ThemeProvider>
  );
}
