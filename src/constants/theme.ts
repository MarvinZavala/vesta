// Vesta App Theme
// Professional Finance App - Emerald & Gold Palette
// Designed for trust, growth, and wealth management

export const Colors = {
  light: {
    // Primary brand colors - Emerald Green (Trust, Growth, Wealth)
    primary: '#059669', // Emerald 600
    primaryLight: '#10B981', // Emerald 500
    primaryDark: '#047857', // Emerald 700

    // Accent - Gold (Premium, Success)
    accent: '#D97706', // Amber 600
    accentLight: '#F59E0B', // Amber 500

    // Background
    background: '#FFFFFF',
    backgroundSecondary: '#F8FAFC', // Slate 50
    backgroundTertiary: '#F1F5F9', // Slate 100

    // Text
    text: '#0F172A', // Slate 900
    textSecondary: '#475569', // Slate 600
    textTertiary: '#94A3B8', // Slate 400

    // UI elements
    border: '#E2E8F0', // Slate 200
    card: '#FFFFFF',
    cardBorder: '#E2E8F0',

    // Semantic colors
    success: '#059669', // Emerald
    successLight: '#D1FAE5', // Emerald 100
    warning: '#D97706', // Amber
    warningLight: '#FEF3C7', // Amber 100
    error: '#DC2626', // Red 600
    errorLight: '#FEE2E2', // Red 100
    info: '#0284C7', // Sky 600
    infoLight: '#E0F2FE', // Sky 100

    // Financial colors
    gain: '#059669', // Emerald - Profit
    loss: '#DC2626', // Red - Loss
    neutral: '#64748B', // Slate 500

    // Tab bar
    tabIconDefault: '#94A3B8',
    tabIconSelected: '#059669',
  },
  dark: {
    // Primary brand colors - Emerald Green
    primary: '#10B981', // Emerald 500 (brighter for dark)
    primaryLight: '#34D399', // Emerald 400
    primaryDark: '#059669', // Emerald 600

    // Accent - Gold
    accent: '#F59E0B', // Amber 500
    accentLight: '#FBBF24', // Amber 400

    // Background - Deep slate
    background: '#0F172A', // Slate 900
    backgroundSecondary: '#1E293B', // Slate 800
    backgroundTertiary: '#334155', // Slate 700

    // Text
    text: '#F8FAFC', // Slate 50
    textSecondary: '#CBD5E1', // Slate 300
    textTertiary: '#64748B', // Slate 500

    // UI elements
    border: '#334155', // Slate 700
    card: '#1E293B', // Slate 800
    cardBorder: '#475569', // Slate 600

    // Semantic colors
    success: '#34D399', // Emerald 400
    successLight: '#064E3B', // Emerald 900
    warning: '#FBBF24', // Amber 400
    warningLight: '#78350F', // Amber 900
    error: '#F87171', // Red 400
    errorLight: '#7F1D1D', // Red 900
    info: '#38BDF8', // Sky 400
    infoLight: '#0C4A6E', // Sky 900

    // Financial colors
    gain: '#34D399', // Emerald
    loss: '#F87171', // Red
    neutral: '#94A3B8', // Slate 400

    // Tab bar
    tabIconDefault: '#64748B',
    tabIconSelected: '#10B981',
  },
};

// Brand colors (constant across themes)
export const Brand = {
  emerald: '#059669',
  emeraldLight: '#10B981',
  gold: '#D97706',
  goldLight: '#F59E0B',
  white: '#FFFFFF',
  black: '#0F172A',
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
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
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
  hero: 48,
};

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const Shadow = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  xl: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Animation durations
export const Animation = {
  fast: 150,
  normal: 300,
  slow: 500,
};
