// Yahoo Finance chart API (free, no API key needed)
// Used as fallback when Finnhub candle endpoint is restricted

const BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';

export interface YahooQuote {
  price: number;
  change: number;
  changePercent: number;
}

/**
 * Map days count to Yahoo Finance range + interval parameters
 */
export function daysToYahooParams(days: number | 'max'): { range: string; interval: string } {
  if (days === 'max') return { range: '5y', interval: '1mo' };
  if (days <= 1) return { range: '1d', interval: '5m' };
  if (days <= 7) return { range: '5d', interval: '15m' };
  if (days <= 30) return { range: '1mo', interval: '1d' };
  if (days <= 90) return { range: '3mo', interval: '1d' };
  if (days <= 365) return { range: '1y', interval: '1wk' };
  return { range: '5y', interval: '1mo' };
}

/**
 * Fetch chart data from Yahoo Finance
 * Free, no key, works for US and international stocks/ETFs
 */
export async function getYahooChart(
  symbol: string,
  days: number | 'max'
): Promise<{ timestamp: number; price: number }[]> {
  try {
    const { range, interval } = daysToYahooParams(days);
    const url = `${BASE_URL}/${encodeURIComponent(symbol.toUpperCase())}?range=${range}&interval=${interval}&includePrePost=false`;

    const response = await fetch(url);

    if (!response.ok) {
      return [];
    }

    const json = await response.json();
    const result = json?.chart?.result?.[0];
    if (!result) return [];

    const timestamps: number[] = result.timestamp || [];
    const closes: (number | null)[] = result.indicators?.quote?.[0]?.close || [];

    return timestamps
      .map((t, i) => ({
        timestamp: t * 1000,
        price: closes[i] as number,
      }))
      .filter((p) => p.price != null && !isNaN(p.price));
  } catch (error) {
    console.error('Yahoo Finance chart error:', error);
    return [];
  }
}

/**
 * Fetch near real-time quote data from Yahoo chart endpoint.
 * Used as fallback when Finnhub quote is restricted.
 */
export async function getYahooQuote(symbol: string): Promise<YahooQuote | null> {
  try {
    const normalized = symbol.trim().toUpperCase();
    if (!normalized) return null;

    const url = `${BASE_URL}/${encodeURIComponent(normalized)}?range=2d&interval=1d&includePrePost=false`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const json = await response.json();
    const result = json?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta || {};
    const closes: (number | null)[] = result.indicators?.quote?.[0]?.close || [];
    const latestClose = closes.length > 0 ? closes[closes.length - 1] : null;
    const prevCloseFromSeries = closes.length > 1 ? closes[closes.length - 2] : null;

    // Prefer market metadata for "now", then fallback to latest close.
    const latestPrice = Number(meta.regularMarketPrice ?? latestClose);
    const previousClose = Number(meta.chartPreviousClose ?? meta.previousClose ?? prevCloseFromSeries);

    if (!Number.isFinite(latestPrice) || latestPrice <= 0) {
      return null;
    }

    const validPrevClose = Number.isFinite(previousClose) && previousClose > 0 ? previousClose : latestPrice;
    const change = latestPrice - validPrevClose;
    const changePercent = validPrevClose > 0 ? (change / validPrevClose) * 100 : 0;

    return {
      price: latestPrice,
      change,
      changePercent,
    };
  } catch (error) {
    console.error('Yahoo Finance quote error:', error);
    return null;
  }
}
