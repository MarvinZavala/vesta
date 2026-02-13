import { create } from 'zustand';
import { supabase } from '@/services/supabase';
import {
  Portfolio,
  Holding,
  HoldingWithPrice,
  PortfolioSummary,
  AssetType,
  PriceCache,
} from '@/types/database';

interface PortfolioState {
  portfolios: Portfolio[];
  activePortfolio: Portfolio | null;
  holdings: Holding[];
  holdingsWithPrices: HoldingWithPrice[];
  priceCache: Record<string, PriceCache>;
  summary: PortfolioSummary | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchPortfolios: () => Promise<void>;
  createPortfolio: (name: string, description?: string) => Promise<Portfolio | null>;
  setActivePortfolio: (portfolio: Portfolio) => void;
  fetchHoldings: (portfolioId: string) => Promise<void>;
  addHolding: (holding: Omit<Holding, 'id' | 'created_at' | 'updated_at'>) => Promise<Holding | null>;
  updateHolding: (id: string, updates: Partial<Holding>) => Promise<boolean>;
  deleteHolding: (id: string) => Promise<boolean>;
  updatePrices: (prices: PriceCache[]) => void;
  calculateSummary: () => void;
  clearError: () => void;
}

const METAL_SYMBOL_BY_TYPE: Partial<Record<AssetType, string>> = {
  commodity_gold: 'XAU',
  commodity_silver: 'XAG',
  commodity_platinum: 'XPT',
};

function getPriceKeySymbol(holding: Holding): string | null {
  const metalSymbol = METAL_SYMBOL_BY_TYPE[holding.asset_type];
  if (metalSymbol) return metalSymbol;
  return holding.symbol ? holding.symbol.toUpperCase() : null;
}

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  portfolios: [],
  activePortfolio: null,
  holdings: [],
  holdingsWithPrices: [],
  priceCache: {},
  summary: null,
  isLoading: false,
  error: null,

  fetchPortfolios: async () => {
    set({ isLoading: true, error: null });

    const { data, error } = await supabase
      .from('portfolios')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      set({ isLoading: false, error: error.message });
      return;
    }

    const portfolios = data as Portfolio[];
    set({ portfolios, isLoading: false });

    // Set active portfolio to default or first
    if (portfolios.length > 0 && !get().activePortfolio) {
      const defaultPortfolio = portfolios.find(p => p.is_default) || portfolios[0];
      set({ activePortfolio: defaultPortfolio });
      await get().fetchHoldings(defaultPortfolio.id);
    }
  },

  createPortfolio: async (name, description) => {
    set({ isLoading: true, error: null });

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      set({ isLoading: false, error: 'Not authenticated' });
      return null;
    }

    const isFirst = get().portfolios.length === 0;

    const { data, error } = await supabase
      .from('portfolios')
      .insert({
        user_id: userData.user.id,
        name,
        description: description || null,
        is_default: isFirst,
      })
      .select()
      .single();

    if (error) {
      set({ isLoading: false, error: error.message });
      return null;
    }

    const portfolio = data as Portfolio;
    set({
      portfolios: [...get().portfolios, portfolio],
      isLoading: false
    });

    if (isFirst) {
      set({ activePortfolio: portfolio });
    }

    return portfolio;
  },

  setActivePortfolio: (portfolio) => {
    set({ activePortfolio: portfolio });
    get().fetchHoldings(portfolio.id);
  },

  fetchHoldings: async (portfolioId) => {
    set({ isLoading: true, error: null });

    const { data, error } = await supabase
      .from('holdings')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .order('created_at', { ascending: false });

    if (error) {
      set({ isLoading: false, error: error.message });
      return;
    }

    const holdings = data as Holding[];
    set({ holdings, isLoading: false });

    // Calculate holdings with prices
    get().calculateSummary();
  },

  addHolding: async (holding) => {
    set({ isLoading: true, error: null });

    const { data, error } = await supabase
      .from('holdings')
      .insert(holding)
      .select()
      .single();

    if (error) {
      set({ isLoading: false, error: error.message });
      return null;
    }

    const newHolding = data as Holding;
    set({
      holdings: [newHolding, ...get().holdings],
      isLoading: false
    });

    get().calculateSummary();
    return newHolding;
  },

  updateHolding: async (id, updates) => {
    set({ isLoading: true, error: null });

    const { error } = await supabase
      .from('holdings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      set({ isLoading: false, error: error.message });
      return false;
    }

    set({
      holdings: get().holdings.map(h =>
        h.id === id ? { ...h, ...updates } : h
      ),
      isLoading: false
    });

    get().calculateSummary();
    return true;
  },

  deleteHolding: async (id) => {
    set({ isLoading: true, error: null });

    const { error } = await supabase
      .from('holdings')
      .delete()
      .eq('id', id);

    if (error) {
      set({ isLoading: false, error: error.message });
      return false;
    }

    set({
      holdings: get().holdings.filter(h => h.id !== id),
      isLoading: false
    });

    get().calculateSummary();
    return true;
  },

  updatePrices: (prices) => {
    const priceCache: Record<string, PriceCache> = {};
    prices.forEach(price => {
      const key = `${price.asset_type}:${price.symbol}`;
      priceCache[key] = price;
    });

    set({ priceCache: { ...get().priceCache, ...priceCache } });
    get().calculateSummary();
  },

  calculateSummary: () => {
    const { holdings, priceCache } = get();

    if (holdings.length === 0) {
      set({
        holdingsWithPrices: [],
        summary: {
          total_value: 0,
          total_gain_loss: 0,
          total_gain_loss_percent: 0,
          day_change: 0,
          day_change_percent: 0,
          holdings_count: 0,
          allocation_by_type: {} as Record<AssetType, number>,
          allocation_by_sector: {},
          allocation_by_country: {},
        }
      });
      return;
    }

    let totalValue = 0;
    let totalCostBasis = 0;
    let totalDayChange = 0;
    const allocationByType: Record<string, number> = {};
    const allocationBySector: Record<string, number> = {};
    const allocationByCountry: Record<string, number> = {};

    const holdingsWithPrices: HoldingWithPrice[] = holdings.map(holding => {
      const keySymbol = getPriceKeySymbol(holding);
      const priceKey = `${holding.asset_type}:${keySymbol ?? ''}`;
      const cachedPrice = priceCache[priceKey];

      // Use cached price, manual price, or cost basis as fallback
      const currentPrice = cachedPrice?.price ?? holding.manual_price ?? holding.cost_basis ?? 0;
      const currentValue = currentPrice * holding.quantity;
      const costBasisTotal = (holding.cost_basis ?? 0) * holding.quantity;
      const gainLoss = currentValue - costBasisTotal;
      const gainLossPercent = costBasisTotal > 0 ? (gainLoss / costBasisTotal) * 100 : 0;

      // Accumulate totals
      totalValue += currentValue;
      totalCostBasis += costBasisTotal;

      if (cachedPrice?.price_change_24h != null) {
        totalDayChange += cachedPrice.price_change_24h * holding.quantity;
      }

      // Accumulate allocations
      allocationByType[holding.asset_type] = (allocationByType[holding.asset_type] ?? 0) + currentValue;

      if (holding.sector) {
        allocationBySector[holding.sector] = (allocationBySector[holding.sector] ?? 0) + currentValue;
      }

      const countryKey = holding.country || 'Global';
      allocationByCountry[countryKey] = (allocationByCountry[countryKey] ?? 0) + currentValue;

      return {
        ...holding,
        current_price: currentPrice,
        current_value: currentValue,
        gain_loss: gainLoss,
        gain_loss_percent: gainLossPercent,
        price_change_24h: cachedPrice?.price_change_24h ?? null,
        price_change_percent_24h: cachedPrice?.price_change_percent_24h ?? null,
      };
    });

    // Convert allocations to percentages
    const convertToPercent = (obj: Record<string, number>): Record<string, number> => {
      const result: Record<string, number> = {};
      for (const key in obj) {
        result[key] = totalValue > 0 ? (obj[key] / totalValue) * 100 : 0;
      }
      return result;
    };

    const totalGainLoss = totalValue - totalCostBasis;
    const totalGainLossPercent = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;
    const dayChangePercent = (totalValue - totalDayChange) > 0
      ? (totalDayChange / (totalValue - totalDayChange)) * 100
      : 0;

    set({
      holdingsWithPrices,
      summary: {
        total_value: totalValue,
        total_gain_loss: totalGainLoss,
        total_gain_loss_percent: totalGainLossPercent,
        day_change: totalDayChange,
        day_change_percent: dayChangePercent,
        holdings_count: holdings.length,
        allocation_by_type: convertToPercent(allocationByType) as Record<AssetType, number>,
        allocation_by_sector: convertToPercent(allocationBySector),
        allocation_by_country: convertToPercent(allocationByCountry),
      }
    });
  },

  clearError: () => set({ error: null }),
}));
