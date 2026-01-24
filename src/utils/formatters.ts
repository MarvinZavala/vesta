// Currency and number formatters

export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(amount);
}

export function formatCompactCurrency(
  amount: number,
  currency: string = 'USD'
): string {
  if (Math.abs(amount) >= 1_000_000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  }

  return formatCurrency(amount, currency);
}

export function formatPercent(value: number, decimals: number = 2): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

export function formatQuantity(quantity: number): string {
  // For crypto and small quantities, show more decimals
  if (quantity < 1) {
    return formatNumber(quantity, { maximumFractionDigits: 8 });
  }
  if (quantity < 100) {
    return formatNumber(quantity, { maximumFractionDigits: 4 });
  }
  return formatNumber(quantity, { maximumFractionDigits: 2 });
}

export function formatDate(dateString: string, format: 'short' | 'long' = 'short'): string {
  const date = new Date(dateString);

  if (format === 'long') {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return formatDate(dateString);
}

// Asset type display names
export const ASSET_TYPE_LABELS: Record<string, string> = {
  stock: 'Stock',
  etf: 'ETF',
  mutual_fund: 'Mutual Fund',
  crypto: 'Crypto',
  commodity_gold: 'Gold',
  commodity_silver: 'Silver',
  commodity_platinum: 'Platinum',
  fixed_income_bond: 'Bond',
  fixed_income_cd: 'CD',
  real_estate: 'Real Estate',
  cash: 'Cash',
  other: 'Other',
};

// Asset type colors for charts
export const ASSET_TYPE_COLORS: Record<string, string> = {
  stock: '#4F46E5', // Indigo
  etf: '#7C3AED', // Violet
  mutual_fund: '#8B5CF6', // Purple
  crypto: '#F59E0B', // Amber
  commodity_gold: '#EAB308', // Yellow
  commodity_silver: '#9CA3AF', // Gray
  commodity_platinum: '#6B7280', // Gray dark
  fixed_income_bond: '#10B981', // Emerald
  fixed_income_cd: '#14B8A6', // Teal
  real_estate: '#F97316', // Orange
  cash: '#22C55E', // Green
  other: '#6366F1', // Indigo light
};

// Sector colors
export const SECTOR_COLORS: Record<string, string> = {
  Technology: '#3B82F6',
  Healthcare: '#EF4444',
  Financial: '#10B981',
  'Consumer Discretionary': '#F59E0B',
  'Consumer Staples': '#84CC16',
  Energy: '#F97316',
  Industrials: '#6366F1',
  Materials: '#8B5CF6',
  Utilities: '#06B6D4',
  'Real Estate': '#EC4899',
  Communication: '#14B8A6',
};
