// Unified price service
// Coordinates fetching prices from multiple sources

import { getStockQuote, getMultipleStockQuotes, StockQuote } from './finnhub';
import { getCoinPrice, getMultipleCoinPrices, getCoinGeckoId, CoinPrice } from './coingecko';
import { getMetalPrice, getMetalSymbol, MetalPrice } from './metals';
import { supabase } from '../supabase';
import { AssetType, PriceCache, Holding } from '@/types/database';

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

function getCacheKey(symbol: string, assetType: AssetType): string {
  return `${assetType}:${symbol}`;
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
  const cacheKey = getCacheKey(symbol, assetType);

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
        const quote = await getStockQuote(symbol);
        if (quote) {
          price = {
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
        break;
      }

      case 'crypto': {
        const coinId = getCoinGeckoId(symbol);
        if (coinId) {
          const coinPrice = await getCoinPrice(coinId);
          if (coinPrice) {
            price = {
              symbol,
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
        const metalSymbol = getMetalSymbol(assetType);
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
    console.error(`Error fetching price for ${symbol}:`, error);
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
    if (!holding.symbol) continue;

    switch (holding.asset_type) {
      case 'stock':
      case 'etf':
      case 'mutual_fund':
        stockSymbols.push(holding.symbol);
        symbolToAssetType.set(holding.symbol, holding.asset_type);
        break;
      case 'crypto':
        cryptoSymbols.push(holding.symbol);
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
    const stockQuotes = await getMultipleStockQuotes([...new Set(stockSymbols)]);
    for (const [symbol, quote] of stockQuotes) {
      const actualType = symbolToAssetType.get(symbol) || 'stock';
      const price: UnifiedPrice = {
        symbol,
        assetType: actualType,
        price: quote.c,
        priceChange24h: quote.d,
        priceChangePercent24h: quote.dp,
        currency: 'USD',
        source: 'finnhub',
        fetchedAt: new Date(),
      };
      results.set(getCacheKey(symbol, actualType), price);
      priceCache.set(getCacheKey(symbol, actualType), price);
    }
  }

  // Fetch crypto in batch
  if (cryptoSymbols.length > 0) {
    const coinIds = cryptoSymbols
      .map((s) => getCoinGeckoId(s))
      .filter((id): id is string => id !== null);

    if (coinIds.length > 0) {
      const coinPrices = await getMultipleCoinPrices([...new Set(coinIds)]);
      for (const coinPrice of coinPrices) {
        const symbol = coinPrice.symbol.toUpperCase();
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
