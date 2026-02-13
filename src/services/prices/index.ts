// Unified price service
// Coordinates fetching prices from multiple sources

import { getStockQuote, getMultipleStockQuotes, getStockCandles, StockQuote } from './finnhub';
import {
  getCoinPrice,
  getMultipleCoinPrices,
  getCoinMarketChart,
  resolveCoinGeckoId,
} from './coingecko';
import { getMetalPrice, getMetalSymbol } from './metals';
import { getYahooChart, getYahooQuote, YahooQuote } from './yahoo';
import { supabase } from '../supabase';
import { AssetType, Holding } from '@/types/database';

export interface UnifiedPrice {
  symbol: string;
  assetType: AssetType;
  price: number;
  priceChange24h: number | null;
  priceChangePercent24h: number | null;
  currency: string;
  source: 'finnhub' | 'coingecko' | 'metals_api' | 'manual';
  fetchedAt: Date;
}

// Cache prices in memory for quick access
const priceCache = new Map<string, UnifiedPrice>();
const CACHE_DURATION = 60 * 1000; // 1 minute for stocks
const CRYPTO_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for crypto
const METALS_CACHE_DURATION = 60 * 60 * 1000; // 1 hour for metals
const METAL_HISTORY_SYMBOL_BY_TYPE: Partial<Record<AssetType, string>> = {
  commodity_gold: 'GC=F',
  commodity_silver: 'SI=F',
  commodity_platinum: 'PL=F',
};

function getCacheKey(symbol: string, assetType: AssetType): string {
  return `${assetType}:${symbol}`;
}

function getNormalizedSymbol(symbol: string | null, assetType: AssetType): string | null {
  if (assetType === 'commodity_gold' || assetType === 'commodity_silver' || assetType === 'commodity_platinum') {
    return getMetalSymbol(assetType);
  }
  return symbol ? symbol.toUpperCase() : null;
}

function mapStockQuoteToUnifiedPrice(symbol: string, assetType: AssetType, quote: StockQuote): UnifiedPrice {
  return {
    symbol,
    assetType,
    price: quote.c,
    priceChange24h: quote.d,
    priceChangePercent24h: quote.dp,
    currency: 'USD',
    source: 'finnhub',
    fetchedAt: new Date(),
  };
}

function mapYahooQuoteToStockQuote(quote: YahooQuote): StockQuote {
  return {
    c: quote.price,
    d: quote.change,
    dp: quote.changePercent,
    h: quote.price,
    l: quote.price,
    o: quote.price,
    pc: quote.price - quote.change,
    t: Math.floor(Date.now() / 1000),
  };
}

function isCacheValid(price: UnifiedPrice, assetType: AssetType): boolean {
  const now = Date.now();
  const cacheAge = now - price.fetchedAt.getTime();

  switch (assetType) {
    case 'crypto':
      return cacheAge < CRYPTO_CACHE_DURATION;
    case 'commodity_gold':
    case 'commodity_silver':
    case 'commodity_platinum':
      return cacheAge < METALS_CACHE_DURATION;
    default:
      return cacheAge < CACHE_DURATION;
  }
}

export async function fetchPrice(
  symbol: string,
  assetType: AssetType
): Promise<UnifiedPrice | null> {
  const normalizedSymbol = getNormalizedSymbol(symbol, assetType);
  if (!normalizedSymbol) return null;
  const cacheKey = getCacheKey(normalizedSymbol, assetType);

  // Check memory cache first
  const cached = priceCache.get(cacheKey);
  if (cached && isCacheValid(cached, assetType)) {
    return cached;
  }

  let price: UnifiedPrice | null = null;

  try {
    switch (assetType) {
      case 'stock':
      case 'etf':
      case 'mutual_fund': {
        const quote = await getStockQuote(normalizedSymbol);
        if (quote) {
          price = mapStockQuoteToUnifiedPrice(normalizedSymbol, assetType, quote);
        } else {
          const yahooQuote = await getYahooQuote(normalizedSymbol);
          if (yahooQuote) {
            price = mapStockQuoteToUnifiedPrice(
              normalizedSymbol,
              assetType,
              mapYahooQuoteToStockQuote(yahooQuote)
            );
          }
        }
        break;
      }

      case 'crypto': {
        const coinId = await resolveCoinGeckoId(normalizedSymbol);
        if (coinId) {
          const coinPrice = await getCoinPrice(coinId);
          if (coinPrice) {
            price = {
              symbol: normalizedSymbol,
              assetType,
              price: coinPrice.current_price,
              priceChange24h: coinPrice.price_change_24h,
              priceChangePercent24h: coinPrice.price_change_percentage_24h,
              currency: 'USD',
              source: 'coingecko',
              fetchedAt: new Date(),
            };
          }
        }
        break;
      }

      case 'commodity_gold':
      case 'commodity_silver':
      case 'commodity_platinum': {
        const metalSymbol = getNormalizedSymbol(normalizedSymbol, assetType);
        if (metalSymbol) {
          const metalPrice = await getMetalPrice(metalSymbol);
          if (metalPrice) {
            price = {
              symbol: metalSymbol,
              assetType,
              price: metalPrice.price,
              priceChange24h: null, // Metals API doesn't provide 24h change in free tier
              priceChangePercent24h: null,
              currency: metalPrice.currency,
              source: 'metals_api',
              fetchedAt: new Date(),
            };
          }
        }
        break;
      }

      default:
        // Manual entry assets don't have external prices
        return null;
    }
  } catch (error) {
    console.error(`Error fetching price for ${normalizedSymbol}:`, error);
  }

  if (price) {
    priceCache.set(cacheKey, price);

    // Update database cache
    await updatePriceCache(price);
  }

  return price;
}

export async function fetchPricesForHoldings(
  holdings: Holding[]
): Promise<Map<string, UnifiedPrice>> {
  const results = new Map<string, UnifiedPrice>();

  // Group holdings by asset type for batch processing
  const stockSymbols: string[] = [];
  const symbolToAssetType = new Map<string, AssetType>(); // Track actual asset types
  const cryptoSymbols: string[] = [];
  const metalTypes: AssetType[] = [];

  for (const holding of holdings) {
    const normalizedSymbol = getNormalizedSymbol(holding.symbol, holding.asset_type);

    switch (holding.asset_type) {
      case 'stock':
      case 'etf':
      case 'mutual_fund':
        if (normalizedSymbol) {
          stockSymbols.push(normalizedSymbol);
          symbolToAssetType.set(normalizedSymbol, holding.asset_type);
        }
        break;
      case 'crypto':
        if (normalizedSymbol) {
          cryptoSymbols.push(normalizedSymbol);
        }
        break;
      case 'commodity_gold':
      case 'commodity_silver':
      case 'commodity_platinum':
        if (!metalTypes.includes(holding.asset_type)) {
          metalTypes.push(holding.asset_type);
        }
        break;
    }
  }

  // Fetch stocks/ETFs/mutual funds in batch
  if (stockSymbols.length > 0) {
    const uniqueStockSymbols = [...new Set(stockSymbols)];
    const stockQuotes = await getMultipleStockQuotes(uniqueStockSymbols);

    for (const [symbol, quote] of stockQuotes.entries()) {
      const actualType = symbolToAssetType.get(symbol) || 'stock';
      const price = mapStockQuoteToUnifiedPrice(symbol, actualType, quote);
      results.set(getCacheKey(symbol, actualType), price);
      priceCache.set(getCacheKey(symbol, actualType), price);
    }

    // Fallback quotes from Yahoo for symbols restricted by Finnhub (e.g. 403)
    const missingSymbols = uniqueStockSymbols.filter((symbol) => !stockQuotes.has(symbol));
    if (missingSymbols.length > 0) {
      const fallbackQuotes = await Promise.all(
        missingSymbols.map(async (symbol) => {
          const yahooQuote = await getYahooQuote(symbol);
          return yahooQuote ? { symbol, quote: mapYahooQuoteToStockQuote(yahooQuote) } : null;
        })
      );

      for (const fallback of fallbackQuotes) {
        if (!fallback) continue;
        const actualType = symbolToAssetType.get(fallback.symbol) || 'stock';
        const price = mapStockQuoteToUnifiedPrice(fallback.symbol, actualType, fallback.quote);
        results.set(getCacheKey(fallback.symbol, actualType), price);
        priceCache.set(getCacheKey(fallback.symbol, actualType), price);
      }
    }
  }

  // Fetch crypto in batch
  if (cryptoSymbols.length > 0) {
    const symbolToCoinId = new Map<string, string>();
    await Promise.all(
      [...new Set(cryptoSymbols)].map(async (symbol) => {
        const coinId = await resolveCoinGeckoId(symbol);
        if (coinId) {
          symbolToCoinId.set(symbol, coinId);
        }
      })
    );
    const coinIds = [...new Set(symbolToCoinId.values())];

    if (coinIds.length > 0) {
      const coinPrices = await getMultipleCoinPrices([...new Set(coinIds)]);
      for (const coinPrice of coinPrices) {
        const symbolsForCoin = Array.from(symbolToCoinId.entries())
          .filter(([, coinId]) => coinId === coinPrice.id)
          .map(([symbol]) => symbol);
        const symbol = symbolsForCoin[0] || coinPrice.symbol.toUpperCase();
        const price: UnifiedPrice = {
          symbol,
          assetType: 'crypto',
          price: coinPrice.current_price,
          priceChange24h: coinPrice.price_change_24h,
          priceChangePercent24h: coinPrice.price_change_percentage_24h,
          currency: 'USD',
          source: 'coingecko',
          fetchedAt: new Date(),
        };
        results.set(getCacheKey(symbol, 'crypto'), price);
        priceCache.set(getCacheKey(symbol, 'crypto'), price);
      }
    }
  }

  // Fetch metals
  for (const metalType of metalTypes) {
    const metalSymbol = getMetalSymbol(metalType);
    if (metalSymbol) {
      const metalPrice = await getMetalPrice(metalSymbol);
      if (metalPrice) {
        const price: UnifiedPrice = {
          symbol: metalSymbol,
          assetType: metalType,
          price: metalPrice.price,
          priceChange24h: null,
          priceChangePercent24h: null,
          currency: 'USD',
          source: 'metals_api',
          fetchedAt: new Date(),
        };
        results.set(getCacheKey(metalSymbol, metalType), price);
        priceCache.set(getCacheKey(metalSymbol, metalType), price);
      }
    }
  }

  return results;
}

async function updatePriceCache(price: UnifiedPrice): Promise<void> {
  try {
    await supabase.from('price_cache').upsert(
      {
        symbol: price.symbol,
        asset_type: price.assetType,
        price: price.price,
        price_change_24h: price.priceChange24h,
        price_change_percent_24h: price.priceChangePercent24h,
        currency: price.currency,
        source: price.source,
        fetched_at: price.fetchedAt.toISOString(),
      },
      {
        onConflict: 'symbol,asset_type,currency',
      }
    );
  } catch (error) {
    console.error('Error updating price cache:', error);
  }
}

export async function loadCachedPrices(): Promise<Map<string, UnifiedPrice>> {
  const results = new Map<string, UnifiedPrice>();

  try {
    const { data, error } = await supabase
      .from('price_cache')
      .select('*')
      .order('fetched_at', { ascending: false });

    if (error) {
      console.error('Error loading cached prices:', error);
      return results;
    }

    for (const row of data || []) {
      const price: UnifiedPrice = {
        symbol: row.symbol,
        assetType: row.asset_type as AssetType,
        price: row.price,
        priceChange24h: row.price_change_24h,
        priceChangePercent24h: row.price_change_percent_24h,
        currency: row.currency,
        source: row.source as UnifiedPrice['source'],
        fetchedAt: new Date(row.fetched_at),
      };
      results.set(getCacheKey(price.symbol, price.assetType), price);
    }
  } catch (error) {
    console.error('Error loading cached prices:', error);
  }

  return results;
}

// Clear memory cache
export function clearPriceCache(): void {
  priceCache.clear();
}

// --- Price History ---

export interface PricePoint {
  timestamp: number;
  price: number;
}

// In-memory cache for history data
const historyCache = new Map<string, { data: PricePoint[]; fetchedAt: number }>();
const HISTORY_CACHE_DURATION = 5 * 60 * 1000; // 5 min

function getHistoryCacheKey(symbol: string, days: number | 'max'): string {
  return `history:${symbol}:${days}`;
}

/**
 * Fetch price history for any supported asset type.
 * Returns normalized PricePoint[] sorted by timestamp ascending.
 */
export async function fetchPriceHistory(
  symbol: string,
  assetType: AssetType,
  days: number | 'max' = 30
): Promise<PricePoint[]> {
  const normalizedSymbol = getNormalizedSymbol(symbol, assetType) || symbol.toUpperCase();
  const cacheKey = getHistoryCacheKey(`${assetType}:${normalizedSymbol}`, days);
  const cached = historyCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < HISTORY_CACHE_DURATION) {
    return cached.data;
  }

  let data: PricePoint[] = [];

  try {
    switch (assetType) {
      case 'crypto': {
        const coinId = await resolveCoinGeckoId(normalizedSymbol);
        if (coinId) {
          data = await getCoinMarketChart(coinId, days);
        }
        break;
      }
      case 'stock':
      case 'etf':
      case 'mutual_fund': {
        // Try Finnhub first
        const now = Math.floor(Date.now() / 1000);
        const daysNum = days === 'max' ? 365 * 5 : days;
        const from = now - daysNum * 24 * 60 * 60;
        const resolution = daysNum <= 7 ? '60' : 'D';
        data = await getStockCandles(normalizedSymbol, resolution, from, now);

        // Fallback to Yahoo Finance if Finnhub returns no data (403/restricted)
        if (data.length === 0) {
          data = await getYahooChart(normalizedSymbol, days);
        }
        break;
      }
      case 'commodity_gold':
      case 'commodity_silver':
      case 'commodity_platinum': {
        const yahooSymbol = METAL_HISTORY_SYMBOL_BY_TYPE[assetType];
        if (yahooSymbol) {
          data = await getYahooChart(yahooSymbol, days);
        }
        break;
      }
      default:
        // Manual assets have no price history
        return [];
    }
  } catch (error) {
    console.error(`Error fetching price history for ${normalizedSymbol}:`, error);
  }

  if (data.length > 0) {
    const normalized = [...data].sort((a, b) => a.timestamp - b.timestamp);
    historyCache.set(cacheKey, { data: normalized, fetchedAt: Date.now() });
    return normalized;
  }

  return [];
}
