// Metals-API for precious metals prices (gold, silver, platinum)
// Free tier: 50 requests/month

const METALS_API_KEY = process.env.EXPO_PUBLIC_METALS_API_KEY || 'YOUR_METALS_API_KEY';
const BASE_URL = 'https://metals-api.com/api';

// Alternative: Use free fallback data from public sources
const FALLBACK_URL = 'https://api.metalpriceapi.com/v1';

export interface MetalPrice {
  metal: string;
  price: number;
  currency: string;
  unit: string;
  timestamp: number;
}

// Metal symbols
export const METAL_SYMBOLS = {
  gold: 'XAU',
  silver: 'XAG',
  platinum: 'XPT',
  palladium: 'XPD',
};

// Fallback prices (updated periodically - use as last resort)
const FALLBACK_PRICES: Record<string, number> = {
  XAU: 2050.00, // Gold per oz
  XAG: 23.50,   // Silver per oz
  XPT: 920.00,  // Platinum per oz
  XPD: 1050.00, // Palladium per oz
};

export async function getMetalPrice(
  metalSymbol: string,
  currency: string = 'USD'
): Promise<MetalPrice | null> {
  try {
    // Try primary API
    const response = await fetch(
      `${BASE_URL}/latest?access_key=${METALS_API_KEY}&base=${currency}&symbols=${metalSymbol}`
    );

    if (response.ok) {
      const data = await response.json();

      if (data.success && data.rates && data.rates[metalSymbol]) {
        // API returns rates as currency per 1 oz of metal, we need to invert
        const rate = 1 / data.rates[metalSymbol];

        return {
          metal: metalSymbol,
          price: rate,
          currency,
          unit: 'oz',
          timestamp: data.timestamp || Date.now() / 1000,
        };
      }
    }

    // Use fallback price
    console.log('Using fallback metal price for:', metalSymbol);
    return {
      metal: metalSymbol,
      price: FALLBACK_PRICES[metalSymbol] || 0,
      currency: 'USD',
      unit: 'oz',
      timestamp: Date.now() / 1000,
    };
  } catch (error) {
    console.error('Error fetching metal price:', error);

    // Return fallback
    return {
      metal: metalSymbol,
      price: FALLBACK_PRICES[metalSymbol] || 0,
      currency: 'USD',
      unit: 'oz',
      timestamp: Date.now() / 1000,
    };
  }
}

export async function getAllMetalPrices(
  currency: string = 'USD'
): Promise<Map<string, MetalPrice>> {
  const results = new Map<string, MetalPrice>();

  try {
    const symbols = Object.values(METAL_SYMBOLS).join(',');
    const response = await fetch(
      `${BASE_URL}/latest?access_key=${METALS_API_KEY}&base=${currency}&symbols=${symbols}`
    );

    if (response.ok) {
      const data = await response.json();

      if (data.success && data.rates) {
        for (const [symbol, rate] of Object.entries(data.rates)) {
          results.set(symbol, {
            metal: symbol,
            price: 1 / (rate as number),
            currency,
            unit: 'oz',
            timestamp: data.timestamp || Date.now() / 1000,
          });
        }
        return results;
      }
    }
  } catch (error) {
    console.error('Error fetching all metal prices:', error);
  }

  // Use fallbacks
  for (const [name, symbol] of Object.entries(METAL_SYMBOLS)) {
    results.set(symbol, {
      metal: symbol,
      price: FALLBACK_PRICES[symbol] || 0,
      currency: 'USD',
      unit: 'oz',
      timestamp: Date.now() / 1000,
    });
  }

  return results;
}

// Convert metal type to symbol
export function getMetalSymbol(assetType: string): string | null {
  switch (assetType) {
    case 'commodity_gold':
      return METAL_SYMBOLS.gold;
    case 'commodity_silver':
      return METAL_SYMBOLS.silver;
    case 'commodity_platinum':
      return METAL_SYMBOLS.platinum;
    default:
      return null;
  }
}
