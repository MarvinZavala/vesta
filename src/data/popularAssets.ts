// Popular assets database for quick selection and autocomplete
import { AssetType } from '@/types/database';

export interface PopularAsset {
  symbol: string;
  name: string;
  type: AssetType;
  sector?: string;
  country?: string;
  logo?: string; // emoji or icon name
}

// Top stocks by market cap and popularity
export const POPULAR_STOCKS: PopularAsset[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock', sector: 'Technology', country: 'US', logo: '🍎' },
  { symbol: 'MSFT', name: 'Microsoft', type: 'stock', sector: 'Technology', country: 'US', logo: '🪟' },
  { symbol: 'GOOGL', name: 'Alphabet (Google)', type: 'stock', sector: 'Technology', country: 'US', logo: '🔍' },
  { symbol: 'AMZN', name: 'Amazon', type: 'stock', sector: 'Consumer Cyclical', country: 'US', logo: '📦' },
  { symbol: 'NVDA', name: 'NVIDIA', type: 'stock', sector: 'Technology', country: 'US', logo: '🎮' },
  { symbol: 'META', name: 'Meta Platforms', type: 'stock', sector: 'Technology', country: 'US', logo: '👤' },
  { symbol: 'TSLA', name: 'Tesla', type: 'stock', sector: 'Consumer Cyclical', country: 'US', logo: '🚗' },
  { symbol: 'BRK.B', name: 'Berkshire Hathaway', type: 'stock', sector: 'Financial', country: 'US', logo: '🏦' },
  { symbol: 'JPM', name: 'JPMorgan Chase', type: 'stock', sector: 'Financial', country: 'US', logo: '🏛️' },
  { symbol: 'V', name: 'Visa Inc.', type: 'stock', sector: 'Financial', country: 'US', logo: '💳' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', type: 'stock', sector: 'Healthcare', country: 'US', logo: '💊' },
  { symbol: 'WMT', name: 'Walmart', type: 'stock', sector: 'Consumer Defensive', country: 'US', logo: '🛒' },
  { symbol: 'PG', name: 'Procter & Gamble', type: 'stock', sector: 'Consumer Defensive', country: 'US', logo: '🧴' },
  { symbol: 'MA', name: 'Mastercard', type: 'stock', sector: 'Financial', country: 'US', logo: '💳' },
  { symbol: 'HD', name: 'Home Depot', type: 'stock', sector: 'Consumer Cyclical', country: 'US', logo: '🏠' },
  { symbol: 'DIS', name: 'Walt Disney', type: 'stock', sector: 'Communication Services', country: 'US', logo: '🏰' },
  { symbol: 'NFLX', name: 'Netflix', type: 'stock', sector: 'Communication Services', country: 'US', logo: '🎬' },
  { symbol: 'ADBE', name: 'Adobe', type: 'stock', sector: 'Technology', country: 'US', logo: '🎨' },
  { symbol: 'CRM', name: 'Salesforce', type: 'stock', sector: 'Technology', country: 'US', logo: '☁️' },
  { symbol: 'PYPL', name: 'PayPal', type: 'stock', sector: 'Financial', country: 'US', logo: '💰' },
  { symbol: 'INTC', name: 'Intel', type: 'stock', sector: 'Technology', country: 'US', logo: '💻' },
  { symbol: 'AMD', name: 'AMD', type: 'stock', sector: 'Technology', country: 'US', logo: '🔴' },
  { symbol: 'BA', name: 'Boeing', type: 'stock', sector: 'Industrials', country: 'US', logo: '✈️' },
  { symbol: 'KO', name: 'Coca-Cola', type: 'stock', sector: 'Consumer Defensive', country: 'US', logo: '🥤' },
  { symbol: 'PEP', name: 'PepsiCo', type: 'stock', sector: 'Consumer Defensive', country: 'US', logo: '🥤' },
  { symbol: 'NKE', name: 'Nike', type: 'stock', sector: 'Consumer Cyclical', country: 'US', logo: '👟' },
  { symbol: 'MCD', name: "McDonald's", type: 'stock', sector: 'Consumer Cyclical', country: 'US', logo: '🍔' },
  { symbol: 'SBUX', name: 'Starbucks', type: 'stock', sector: 'Consumer Cyclical', country: 'US', logo: '☕' },
  { symbol: 'COST', name: 'Costco', type: 'stock', sector: 'Consumer Defensive', country: 'US', logo: '🏪' },
  { symbol: 'UNH', name: 'UnitedHealth', type: 'stock', sector: 'Healthcare', country: 'US', logo: '🏥' },
];

// Popular ETFs
export const POPULAR_ETFS: PopularAsset[] = [
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', type: 'etf', sector: 'Broad Market', country: 'US', logo: '📊' },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', type: 'etf', sector: 'Broad Market', country: 'US', logo: '📈' },
  { symbol: 'QQQ', name: 'Invesco QQQ (Nasdaq 100)', type: 'etf', sector: 'Technology', country: 'US', logo: '💻' },
  { symbol: 'VTI', name: 'Vanguard Total Stock Market', type: 'etf', sector: 'Broad Market', country: 'US', logo: '🌎' },
  { symbol: 'IWM', name: 'iShares Russell 2000', type: 'etf', sector: 'Small Cap', country: 'US', logo: '📉' },
  { symbol: 'VGT', name: 'Vanguard Info Tech ETF', type: 'etf', sector: 'Technology', country: 'US', logo: '🖥️' },
  { symbol: 'ARKK', name: 'ARK Innovation ETF', type: 'etf', sector: 'Innovation', country: 'US', logo: '🚀' },
  { symbol: 'VNQ', name: 'Vanguard Real Estate ETF', type: 'etf', sector: 'Real Estate', country: 'US', logo: '🏢' },
  { symbol: 'GLD', name: 'SPDR Gold Shares', type: 'etf', sector: 'Commodities', country: 'US', logo: '🥇' },
  { symbol: 'SLV', name: 'iShares Silver Trust', type: 'etf', sector: 'Commodities', country: 'US', logo: '🥈' },
];

// Popular cryptocurrencies
export const POPULAR_CRYPTO: PopularAsset[] = [
  { symbol: 'BTC', name: 'Bitcoin', type: 'crypto', logo: '₿' },
  { symbol: 'ETH', name: 'Ethereum', type: 'crypto', logo: '⟠' },
  { symbol: 'SOL', name: 'Solana', type: 'crypto', logo: '◎' },
  { symbol: 'BNB', name: 'BNB', type: 'crypto', logo: '🔶' },
  { symbol: 'XRP', name: 'XRP', type: 'crypto', logo: '✕' },
  { symbol: 'ADA', name: 'Cardano', type: 'crypto', logo: '🔵' },
  { symbol: 'DOGE', name: 'Dogecoin', type: 'crypto', logo: '🐕' },
  { symbol: 'DOT', name: 'Polkadot', type: 'crypto', logo: '⚫' },
  { symbol: 'MATIC', name: 'Polygon', type: 'crypto', logo: '🟣' },
  { symbol: 'LINK', name: 'Chainlink', type: 'crypto', logo: '🔗' },
  { symbol: 'AVAX', name: 'Avalanche', type: 'crypto', logo: '🔺' },
  { symbol: 'UNI', name: 'Uniswap', type: 'crypto', logo: '🦄' },
];

// Popular mutual funds
export const POPULAR_MUTUAL_FUNDS: PopularAsset[] = [
  { symbol: 'VFIAX', name: 'Vanguard 500 Index Fund', type: 'mutual_fund', sector: 'Broad Market', country: 'US', logo: '📊' },
  { symbol: 'FXAIX', name: 'Fidelity 500 Index Fund', type: 'mutual_fund', sector: 'Broad Market', country: 'US', logo: '📈' },
  { symbol: 'VTSAX', name: 'Vanguard Total Stock Market', type: 'mutual_fund', sector: 'Broad Market', country: 'US', logo: '🌎' },
  { symbol: 'VBTLX', name: 'Vanguard Total Bond Market', type: 'mutual_fund', sector: 'Bonds', country: 'US', logo: '📄' },
  { symbol: 'VTIAX', name: 'Vanguard Total International', type: 'mutual_fund', sector: 'International', country: 'US', logo: '🌐' },
  { symbol: 'VIGAX', name: 'Vanguard Growth Index', type: 'mutual_fund', sector: 'Growth', country: 'US', logo: '🚀' },
];

// All popular assets combined
export const ALL_POPULAR_ASSETS: PopularAsset[] = [
  ...POPULAR_STOCKS,
  ...POPULAR_ETFS,
  ...POPULAR_CRYPTO,
  ...POPULAR_MUTUAL_FUNDS,
];

// Search function with fuzzy matching
export function searchAssets(query: string, type?: AssetType): PopularAsset[] {
  if (!query || query.length < 1) return [];

  const normalizedQuery = query.toLowerCase().trim();

  let assets = ALL_POPULAR_ASSETS;
  if (type) {
    assets = assets.filter(a => a.type === type);
  }

  // Score and sort results
  const scored = assets
    .map(asset => {
      let score = 0;
      const symbol = asset.symbol.toLowerCase();
      const name = asset.name.toLowerCase();

      // Exact symbol match = highest priority
      if (symbol === normalizedQuery) score = 100;
      // Symbol starts with query
      else if (symbol.startsWith(normalizedQuery)) score = 80;
      // Name starts with query
      else if (name.startsWith(normalizedQuery)) score = 60;
      // Symbol contains query
      else if (symbol.includes(normalizedQuery)) score = 40;
      // Name contains query
      else if (name.includes(normalizedQuery)) score = 20;
      // Word in name starts with query
      else if (name.split(' ').some(word => word.startsWith(normalizedQuery))) score = 30;

      return { asset, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8); // Limit to 8 suggestions

  return scored.map(item => item.asset);
}

// Get featured assets for quick selection (top picks per category)
export function getFeaturedAssets(type: AssetType): PopularAsset[] {
  switch (type) {
    case 'stock':
      return POPULAR_STOCKS.slice(0, 8);
    case 'etf':
      return POPULAR_ETFS.slice(0, 6);
    case 'mutual_fund':
      return POPULAR_MUTUAL_FUNDS.slice(0, 6);
    case 'crypto':
      return POPULAR_CRYPTO.slice(0, 6);
    default:
      return [];
  }
}
