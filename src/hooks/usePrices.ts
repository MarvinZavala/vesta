// Hook for fetching and managing real-time prices
import { useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { usePortfolioStore } from '@/store/portfolioStore';
import { fetchPricesForHoldings, loadCachedPrices, UnifiedPrice } from '@/services/prices';
import { Holding, PriceCache } from '@/types/database';

// Refresh intervals based on subscription tier
const REFRESH_INTERVALS = {
  free: 15 * 60 * 1000,      // 15 minutes for free users
  premium: 60 * 1000,         // 1 minute for premium
  premium_plus: 60 * 1000,    // 1 minute for premium+
};

interface UsePricesOptions {
  subscriptionTier?: 'free' | 'premium' | 'premium_plus';
  autoRefresh?: boolean;
}

export function usePrices(options: UsePricesOptions = {}) {
  const { subscriptionTier = 'free', autoRefresh = true } = options;

  const { holdings, updatePrices } = usePortfolioStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastFetchRef = useRef<number>(0);
  const isFetchingRef = useRef<boolean>(false);

  // Convert UnifiedPrice to PriceCache format for the store
  const convertToPriceCache = useCallback((prices: Map<string, UnifiedPrice>): PriceCache[] => {
    return Array.from(prices.values()).map(price => ({
      id: `${price.assetType}:${price.symbol}`,
      symbol: price.symbol,
      asset_type: price.assetType,
      price: price.price,
      price_change_24h: price.priceChange24h,
      price_change_percent_24h: price.priceChangePercent24h,
      currency: price.currency,
      source: price.source,
      fetched_at: price.fetchedAt.toISOString(),
    }));
  }, []);

  // Fetch prices for all holdings
  const fetchPrices = useCallback(async (force: boolean = false) => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      return;
    }

    // Check if we should skip (unless forced)
    const now = Date.now();
    const interval = REFRESH_INTERVALS[subscriptionTier];
    if (!force && now - lastFetchRef.current < interval) {
      return;
    }

    // Filter holdings that have tradeable symbols
    const tradeableHoldings = holdings.filter(h =>
      h.symbol &&
      ['stock', 'etf', 'mutual_fund', 'crypto', 'commodity_gold', 'commodity_silver', 'commodity_platinum'].includes(h.asset_type)
    );

    if (tradeableHoldings.length === 0) {
      return;
    }

    isFetchingRef.current = true;
    lastFetchRef.current = now;

    try {
      const prices = await fetchPricesForHoldings(tradeableHoldings as Holding[]);
      const priceCacheArray = convertToPriceCache(prices);

      if (priceCacheArray.length > 0) {
        updatePrices(priceCacheArray);
      }
    } catch (error) {
      console.error('Error fetching prices:', error);
    } finally {
      isFetchingRef.current = false;
    }
  }, [holdings, subscriptionTier, updatePrices, convertToPriceCache]);

  // Load cached prices from Supabase on mount
  const loadCached = useCallback(async () => {
    try {
      const cachedPrices = await loadCachedPrices();
      const priceCacheArray = convertToPriceCache(cachedPrices);

      if (priceCacheArray.length > 0) {
        updatePrices(priceCacheArray);
      }
    } catch (error) {
      console.error('Error loading cached prices:', error);
    }
  }, [updatePrices, convertToPriceCache]);

  // Manual refresh function
  const refreshPrices = useCallback(() => {
    return fetchPrices(true);
  }, [fetchPrices]);

  // Set up auto-refresh interval
  useEffect(() => {
    if (!autoRefresh || holdings.length === 0) {
      return;
    }

    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    const interval = REFRESH_INTERVALS[subscriptionTier];

    // Fetch immediately on mount/holdings change
    fetchPrices(true);

    // Set up periodic refresh
    intervalRef.current = setInterval(() => {
      fetchPrices(true);
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [holdings.length, subscriptionTier, autoRefresh, fetchPrices]);

  // Handle app state changes (pause when background, resume when foreground)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App came to foreground - refresh prices
        fetchPrices(true);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [fetchPrices]);

  // Load cached prices on initial mount
  useEffect(() => {
    loadCached();
  }, [loadCached]);

  return {
    refreshPrices,
    fetchPrices,
  };
}
