// Finnhub API for stock prices
// Free tier: 60 API calls/minute

const FINNHUB_API_KEY = process.env.EXPO_PUBLIC_FINNHUB_API_KEY || 'YOUR_FINNHUB_API_KEY';
const BASE_URL = 'https://finnhub.io/api/v1';

export interface StockQuote {
  c: number; // Current price
  d: number; // Change
  dp: number; // Percent change
  h: number; // High price of the day
  l: number; // Low price of the day
  o: number; // Open price of the day
  pc: number; // Previous close price
  t: number; // Timestamp
}

export interface StockSymbol {
  description: string;
  displaySymbol: string;
  symbol: string;
  type: string;
}

export async function getStockQuote(symbol: string): Promise<StockQuote | null> {
  try {
    const response = await fetch(
      `${BASE_URL}/quote?symbol=${symbol.toUpperCase()}&token=${FINNHUB_API_KEY}`
    );

    if (!response.ok) {
      console.error('Finnhub API error:', response.status);
      return null;
    }

    const data = await response.json();

    // Check if we got valid data (c = 0 means no data)
    if (data.c === 0 && data.pc === 0) {
      return null;
    }

    return data as StockQuote;
  } catch (error) {
    console.error('Error fetching stock quote:', error);
    return null;
  }
}

export async function searchStocks(query: string): Promise<StockSymbol[]> {
  try {
    const response = await fetch(
      `${BASE_URL}/search?q=${encodeURIComponent(query)}&token=${FINNHUB_API_KEY}`
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return (data.result || []) as StockSymbol[];
  } catch (error) {
    console.error('Error searching stocks:', error);
    return [];
  }
}

export async function getMultipleStockQuotes(
  symbols: string[]
): Promise<Map<string, StockQuote>> {
  const results = new Map<string, StockQuote>();

  // Fetch in parallel with rate limiting consideration
  const batchSize = 10; // Process 10 at a time to stay within rate limits

  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const promises = batch.map(async (symbol) => {
      const quote = await getStockQuote(symbol);
      if (quote) {
        results.set(symbol, quote);
      }
    });

    await Promise.all(promises);

    // Add small delay between batches to respect rate limits
    if (i + batchSize < symbols.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return results;
}
