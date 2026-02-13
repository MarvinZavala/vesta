// Precious metals prices (gold, silver, platinum)
// Primary: GoldPriceZ.com (FREE, no API key, 30-60 req/hour)
// Fallback: Local prices

const GOLDPRICEZ_URL = 'https://goldpricez.com/api/rates/currency/usd/measure/ounce';

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

// Fallback prices (updated Jan 2026 - use as last resort)
const FALLBACK_PRICES: Record<string, number> = {
  XAU: 2650.00, // Gold per oz
  XAG: 30.50,   // Silver per oz
  XPT: 980.00,  // Platinum per oz
  XPD: 950.00,  // Palladium per oz
};

// GoldPriceZ response interface
interface GoldPriceZResponse {
  gold?: number;
  silver?: number;
  platinum?: number;
  palladium?: number;
  timestamp?: string;
}

// Map GoldPriceZ keys to our symbols
const GOLDPRICEZ_TO_SYMBOL: Record<string, string> = {
  gold: 'XAU',
  silver: 'XAG',
  platinum: 'XPT',
  palladium: 'XPD',
};

export async function getMetalPrice(
  metalSymbol: string,
  currency: string = 'USD'
): Promise<MetalPrice | null> {
  try {
    // Try GoldPriceZ API (free, no key required)
    const response = await fetch(GOLDPRICEZ_URL);

    if (response.ok) {
      const data: GoldPriceZResponse = await response.json();

      // Find the metal name from symbol
      const metalName = Object.entries(GOLDPRICEZ_TO_SYMBOL)
        .find(([_, sym]) => sym === metalSymbol)?.[0];

      if (metalName && data[metalName as keyof GoldPriceZResponse]) {
        const price = data[metalName as keyof GoldPriceZResponse] as number;

        return {
          metal: metalSymbol,
          price,
          currency: 'USD',
          unit: 'oz',
          timestamp: Date.now() / 1000,
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
    // Try GoldPriceZ API (free, no key required)
    const response = await fetch(GOLDPRICEZ_URL);

    if (response.ok) {
      const data: GoldPriceZResponse = await response.json();
      const timestamp = Date.now() / 1000;

      // Map GoldPriceZ response to our format
      for (const [metalName, symbol] of Object.entries(GOLDPRICEZ_TO_SYMBOL)) {
        const price = data[metalName as keyof GoldPriceZResponse] as number | undefined;

        if (price) {
          results.set(symbol, {
            metal: symbol,
            price,
            currency: 'USD',
            unit: 'oz',
            timestamp,
          });
        }
      }

      if (results.size > 0) {
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
