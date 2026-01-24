// Vesta App Theme

export const Colors = {
  light: {
    // Primary brand colors
    primary: '#6366F1', // Indigo
    primaryLight: '#818CF8',
    primaryDark: '#4F46E5',

    // Background
    background: '#FFFFFF',
    backgroundSecondary: '#F9FAFB',
    backgroundTertiary: '#F3F4F6',

    // Text
    text: '#111827',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',

    // UI elements
    border: '#E5E7EB',
    card: '#FFFFFF',
    cardBorder: '#E5E7EB',

    // Semantic colors
    success: '#10B981',
    successLight: '#D1FAE5',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    error: '#EF4444',
    errorLight: '#FEE2E2',

    // Financial colors
    gain: '#10B981', // Green
    loss: '#EF4444', // Red
    neutral: '#6B7280',

    // Tab bar
    tabIconDefault: '#9CA3AF',
    tabIconSelected: '#6366F1',
  },
  dark: {
    // Primary brand colors
    primary: '#818CF8', // Lighter indigo for dark mode
    primaryLight: '#A5B4FC',
    primaryDark: '#6366F1',

    // Background
    background: '#0F172A',
    backgroundSecondary: '#1E293B',
    backgroundTertiary: '#334155',

    // Text
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    textTertiary: '#6B7280',

    // UI elements
    border: '#334155',
    card: '#1E293B',
    cardBorder: '#334155',

    // Semantic colors
    success: '#34D399',
    successLight: '#064E3B',
    warning: '#FBBF24',
    warningLight: '#78350F',
    error: '#F87171',
    errorLight: '#7F1D1D',

    // Financial colors
    gain: '#34D399',
    loss: '#F87171',
    neutral: '#9CA3AF',

    // Tab bar
    tabIconDefault: '#6B7280',
    tabIconSelected: '#818CF8',
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const FontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  display: 40,
};

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
};
