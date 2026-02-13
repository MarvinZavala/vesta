import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';

export default function AssetLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
      }}
    />
  );
}
