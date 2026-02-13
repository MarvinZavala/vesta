// CoinGecko API for cryptocurrency prices
// Free tier: 30 calls/minute, 10,000 calls/month

const BASE_URL = 'https://api.coingecko.com/api/v3';
const API_KEY = process.env.EXPO_PUBLIC_COINGECKO_API_KEY || '';

// Helper to add API key to URL
function addApiKey(url: string): string {
  if (!API_KEY) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}x_cg_demo_api_key=${API_KEY}`;
}

export interface CoinPrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  last_updated: string;
}

export interface CoinSearchResult {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank: number;
  thumb: string;
  large: string;
}

// Common crypto symbol to CoinGecko ID mapping
const SYMBOL_TO_ID: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  USDT: 'tether',
  BNB: 'binancecoin',
  XRP: 'ripple',
  USDC: 'usd-coin',
  SOL: 'solana',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  TRX: 'tron',
  DOT: 'polkadot',
  MATIC: 'matic-network',
  SHIB: 'shiba-inu',
  LTC: 'litecoin',
  AVAX: 'avalanche-2',
  LINK: 'chainlink',
  UNI: 'uniswap',
  ATOM: 'cosmos',
  XLM: 'stellar',
  FIL: 'filecoin',
};

const dynamicSymbolToId = new Map<string, string>();

export function getCoinGeckoId(symbol: string): string | null {
  const normalized = symbol.toUpperCase();
  return dynamicSymbolToId.get(normalized) || SYMBOL_TO_ID[normalized] || null;
}

export async function resolveCoinGeckoId(symbol: string): Promise<string | null> {
  const normalized = symbol.toUpperCase().trim();
  if (!normalized) return null;

  const staticOrCachedId = getCoinGeckoId(normalized);
  if (staticOrCachedId) return staticOrCachedId;

  const results = await searchCoins(normalized);
  const exact = results.find((coin) => coin.symbol.toUpperCase() === normalized);
  if (!exact) return null;

  dynamicSymbolToId.set(normalized, exact.id);
  return exact.id;
}

export async function getCoinPrice(coinId: string, currency: string = 'usd'): Promise<CoinPrice | null> {
  try {
    const url = addApiKey(
      `${BASE_URL}/coins/markets?vs_currency=${currency}&ids=${coinId}&order=market_cap_desc&per_page=1&page=1&sparkline=false&price_change_percentage=24h`
    );
    const response = await fetch(url);

    if (!response.ok) {
      console.error('CoinGecko API error:', response.status);
      return null;
    }

    const data = await response.json();
    return data[0] || null;
  } catch (error) {
    console.error('Error fetching coin price:', error);
    return null;
  }
}

export async function getMultipleCoinPrices(
  coinIds: string[],
  currency: string = 'usd'
): Promise<CoinPrice[]> {
  try {
    const idsString = coinIds.join(',');
    const url = addApiKey(
      `${BASE_URL}/coins/markets?vs_currency=${currency}&ids=${idsString}&order=market_cap_desc&per_page=${coinIds.length}&page=1&sparkline=false&price_change_percentage=24h`
    );
    const response = await fetch(url);

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data as CoinPrice[];
  } catch (error) {
    console.error('Error fetching multiple coin prices:', error);
    return [];
  }
}

export async function searchCoins(query: string): Promise<CoinSearchResult[]> {
  try {
    const url = addApiKey(`${BASE_URL}/search?query=${encodeURIComponent(query)}`);
    const response = await fetch(url);

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return (data.coins || []).slice(0, 10) as CoinSearchResult[];
  } catch (error) {
    console.error('Error searching coins:', error);
    return [];
  }
}

/**
 * Get historical market chart data for a coin
 * @param days - 1, 7, 30, 90, 365, or 'max'
 */
export async function getCoinMarketChart(
  coinId: string,
  days: number | 'max',
  currency: string = 'usd'
): Promise<{ timestamp: number; price: number }[]> {
  try {
    const baseUrl = `${BASE_URL}/coins/${coinId}/market_chart?vs_currency=${currency}&days=${days}`;

    // Try with API key first
    let response = await fetch(addApiKey(baseUrl));

    // If unauthorized/forbidden, wait briefly then try public endpoint (no key)
    if (response.status === 401 || response.status === 403) {
      await new Promise((r) => setTimeout(r, 1500));
      response = await fetch(baseUrl);
    }

    // If rate-limited (429), wait longer and retry once
    if (response.status === 429) {
      await new Promise((r) => setTimeout(r, 3000));
      response = await fetch(baseUrl);
    }

    if (!response.ok) {
      console.error('CoinGecko market chart error:', response.status);
      return [];
    }

    const data = await response.json();
    return (data.prices || []).map(([timestamp, price]: [number, number]) => ({
      timestamp,
      price,
    }));
  } catch (error) {
    console.error('Error fetching coin market chart:', error);
    return [];
  }
}

export async function getSimplePrice(
  coinIds: string[],
  currency: string = 'usd'
): Promise<Record<string, { usd: number; usd_24h_change: number }>> {
  try {
    const idsString = coinIds.join(',');
    const url = addApiKey(
      `${BASE_URL}/simple/price?ids=${idsString}&vs_currencies=${currency}&include_24hr_change=true`
    );
    const response = await fetch(url);

    if (!response.ok) {
      return {};
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching simple prices:', error);
    return {};
  }
}
