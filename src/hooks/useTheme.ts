import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';

export function useTheme() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  return {
    colors,
    isDark,
    colorScheme,
  };
}

export type ThemeColors = typeof Colors.light;
