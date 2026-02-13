import { Link, Stack } from 'expo-router';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';

export default function NotFoundScreen() {
  const { colors } = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: Spacing.xl,
          backgroundColor: colors.background,
        }}
      >
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: BorderRadius.full,
            backgroundColor: colors.backgroundSecondary,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: Spacing.lg,
          }}
        >
          <Ionicons name="compass-outline" size={40} color={colors.textTertiary} />
        </View>
        <Text
          style={{
            fontSize: FontSize.xl,
            fontWeight: FontWeight.bold,
            color: colors.text,
            marginBottom: Spacing.sm,
          }}
        >
          Page Not Found
        </Text>
        <Text
          style={{
            fontSize: FontSize.md,
            color: colors.textSecondary,
            textAlign: 'center',
            marginBottom: Spacing.xl,
          }}
        >
          The screen you're looking for doesn't exist.
        </Text>
        <Link href="/" asChild>
          <Button title="Go Home" size="lg" />
        </Link>
      </View>
    </>
  );
}
