// Database types for Supabase

export type AssetType =
  | 'stock'
  | 'etf'
  | 'mutual_fund'
  | 'crypto'
  | 'commodity_gold'
  | 'commodity_silver'
  | 'commodity_platinum'
  | 'fixed_income_bond'
  | 'fixed_income_cd'
  | 'real_estate'
  | 'cash'
  | 'other';

export type SubscriptionTier = 'free' | 'premium' | 'premium_plus';

export type AlertType = 'price_above' | 'price_below' | 'percent_change' | 'maturity' | 'revaluation';

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  preferred_currency: string;
  subscription_tier: SubscriptionTier;
  revenuecat_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Portfolio {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Holding {
  id: string;
  portfolio_id: string;
  asset_type: AssetType;
  symbol: string | null;
  name: string;
  quantity: number;
  cost_basis: number | null;
  purchase_date: string | null;
  currency: string;

  // For non-traded assets
  manual_price: number | null;
  manual_price_updated_at: string | null;

  // For fixed income
  maturity_date: string | null;
  interest_rate: number | null;
  payment_frequency: 'monthly' | 'quarterly' | 'annually' | null;

  // For real estate
  property_address: string | null;
  property_type: 'residential' | 'commercial' | 'land' | null;
  last_valuation_date: string | null;

  // Metadata
  notes: string | null;
  sector: string | null;
  country: string;
  created_at: string;
  updated_at: string;
}

export interface PriceCache {
  id: string;
  symbol: string;
  asset_type: AssetType;
  price: number;
  price_change_24h: number | null;
  price_change_percent_24h: number | null;
  currency: string;
  source: 'finnhub' | 'coingecko' | 'metals_api' | 'manual';
  fetched_at: string;
}

export interface Alert {
  id: string;
  user_id: string;
  holding_id: string;
  alert_type: AlertType;
  target_value: number | null;
  target_date: string | null;
  is_active: boolean;
  triggered_at: string | null;
  created_at: string;
}

export interface AIAnalysis {
  id: string;
  portfolio_id: string;
  analysis_type: 'diversification' | 'risk' | 'rebalance' | 'general';
  prompt_hash: string;
  response: {
    content: string;
    score?: number;
    recommendations?: string[];
  };
  created_at: string;
}

// Chat session for AI conversations
export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

// Individual message in a chat session
export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

// Computed types for UI
export interface HoldingWithPrice extends Holding {
  current_price: number;
  current_value: number;
  gain_loss: number;
  gain_loss_percent: number;
  price_change_24h: number | null;
  price_change_percent_24h: number | null;
}

export interface PortfolioSummary {
  total_value: number;
  total_gain_loss: number;
  total_gain_loss_percent: number;
  day_change: number;
  day_change_percent: number;
  holdings_count: number;
  allocation_by_type: Record<AssetType, number>;
  allocation_by_sector: Record<string, number>;
  allocation_by_country: Record<string, number>;
}
