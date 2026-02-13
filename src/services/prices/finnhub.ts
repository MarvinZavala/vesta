// Finnhub API for stock prices
// Free tier: 60 API calls/minute

const FINNHUB_API_KEY = process.env.EXPO_PUBLIC_FINNHUB_API_KEY || '';
const BASE_URL = 'https://finnhub.io/api/v1';
const FORBIDDEN_COOLDOWN_MS = 5 * 60 * 1000;
const RATE_LIMIT_RETRY_MS = 1250;

let didWarnMissingApiKey = false;
const endpointForbiddenUntil = new Map<string, number>();

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

export type SearchableMarketAssetType = 'stock' | 'etf' | 'mutual_fund';

export interface ValidatedStockSymbol {
  symbol: string;
  displaySymbol: string;
  description: string;
  type: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeTickerForMatch(symbol: string): string {
  return symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function getCanonicalStockSymbol(match: StockSymbol): string {
  return (match.displaySymbol || match.symbol).toUpperCase();
}

function getEndpointStateKey(endpoint: string): string {
  return endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
}

function shouldSkipEndpoint(endpoint: string): boolean {
  const key = getEndpointStateKey(endpoint);
  const blockedUntil = endpointForbiddenUntil.get(key) ?? 0;
  return blockedUntil > Date.now();
}

function markEndpointForbidden(endpoint: string): void {
  const key = getEndpointStateKey(endpoint);
  endpointForbiddenUntil.set(key, Date.now() + FORBIDDEN_COOLDOWN_MS);
}

function warnMissingApiKeyOnce(): void {
  if (didWarnMissingApiKey) return;
  didWarnMissingApiKey = true;
  console.warn('Finnhub API key missing. Falling back to secondary providers when possible.');
}

async function readBodySnippet(response: Response): Promise<string> {
  try {
    const text = (await response.text()).trim();
    if (!text) return '';
    return text.slice(0, 180);
  } catch {
    return '';
  }
}

async function requestFinnhub<T>(
  endpoint: string,
  params: Record<string, string>,
  options?: { retries?: number; disable403Cooldown?: boolean }
): Promise<T | null> {
  if (!FINNHUB_API_KEY) {
    warnMissingApiKeyOnce();
    return null;
  }

  if (shouldSkipEndpoint(endpoint)) {
    return null;
  }

  const query = new URLSearchParams({ ...params, token: FINNHUB_API_KEY });
  const url = `${BASE_URL}${endpoint}?${query.toString()}`;
  const retries = options?.retries ?? 1;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url);

      if (response.status === 429 && attempt < retries) {
        await sleep(RATE_LIMIT_RETRY_MS * (attempt + 1));
        continue;
      }

      if (response.status === 403) {
        const body = await readBodySnippet(response);
        if (!options?.disable403Cooldown) {
          markEndpointForbidden(endpoint);
        }
        console.warn(
          `Finnhub ${endpoint} returned 403${body ? `: ${body}` : ''}. Switching to fallback data where available.`
        );
        return null;
      }

      if (!response.ok) {
        const body = await readBodySnippet(response);
        console.warn(
          `Finnhub ${endpoint} error ${response.status}${body ? `: ${body}` : ''}`
        );
        return null;
      }

      return (await response.json()) as T;
    } catch (error) {
      if (attempt >= retries) {
        console.error(`Finnhub ${endpoint} request failed:`, error);
        return null;
      }
      await sleep(RATE_LIMIT_RETRY_MS * (attempt + 1));
    }
  }

  return null;
}

export function inferAssetTypeFromFinnhubType(type: string): SearchableMarketAssetType | null {
  const normalized = type.toUpperCase();

  if (normalized.includes('ETF')) return 'etf';
  if (normalized.includes('MUTUAL')) return 'mutual_fund';
  if (
    normalized.includes('COMMON STOCK') ||
    normalized.includes('EQUITY') ||
    normalized.includes('ADR') ||
    normalized.includes('PREFERRED')
  ) {
    return 'stock';
  }

  return null;
}

export function isFinnhubTypeCompatible(
  finnhubType: string,
  expectedType: SearchableMarketAssetType
): boolean {
  const inferredType = inferAssetTypeFromFinnhubType(finnhubType);
  if (inferredType) {
    return inferredType === expectedType;
  }

  // If Finnhub doesn't classify clearly, treat it as a stock-like instrument.
  return expectedType === 'stock';
}

export async function getStockQuote(symbol: string): Promise<StockQuote | null> {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) return null;

  const data = await requestFinnhub<StockQuote>('/quote', { symbol: normalized });
  if (!data) return null;

  // c=0 and pc=0 indicates empty payload
  if (data.c === 0 && data.pc === 0) {
    return null;
  }

  return data;
}

export async function searchStocks(query: string): Promise<StockSymbol[]> {
  const normalized = query.trim();
  if (normalized.length < 1) return [];

  const data = await requestFinnhub<{ result?: StockSymbol[] }>(
    '/search',
    { q: normalized },
    { retries: 0, disable403Cooldown: true }
  );

  if (!data?.result) return [];
  return data.result.slice(0, 20);
}

export async function validateStockSymbol(
  symbol: string,
  expectedType?: SearchableMarketAssetType
): Promise<ValidatedStockSymbol | null> {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) return null;

  const candidates = await searchStocks(normalized);
  const filtered = expectedType
    ? candidates.filter((item) => isFinnhubTypeCompatible(item.type, expectedType))
    : candidates;

  if (filtered.length === 0) return null;

  const normalizedTarget = normalizeTickerForMatch(normalized);
  const exact = filtered.find((item) => {
    const normalizedSymbol = normalizeTickerForMatch(item.symbol);
    const normalizedDisplaySymbol = normalizeTickerForMatch(item.displaySymbol || '');
    return normalizedSymbol === normalizedTarget || normalizedDisplaySymbol === normalizedTarget;
  });

  const match = exact || (filtered.length === 1 ? filtered[0] : null);
  if (!match) return null;

  return {
    symbol: getCanonicalStockSymbol(match),
    displaySymbol: match.displaySymbol,
    description: match.description,
    type: match.type,
  };
}

/**
 * Get stock candle (OHLCV) data for charting
 * @param resolution - 'D' for daily, 'W' for weekly, 'M' for monthly
 */
export async function getStockCandles(
  symbol: string,
  resolution: string,
  from: number,
  to: number
): Promise<{ timestamp: number; price: number }[]> {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) return [];

  const data = await requestFinnhub<{
    s?: string;
    c?: number[];
    t?: number[];
  }>('/stock/candle', {
    symbol: normalized,
    resolution,
    from: String(from),
    to: String(to),
  });

  if (!data) return [];

  // 's' = 'no_data' when no candle data available
  if (data.s === 'no_data' || !Array.isArray(data.c) || !Array.isArray(data.t)) {
    return [];
  }

  // Map close prices with timestamps
  return data.t
    .map((timestamp, index) => ({
      timestamp: timestamp * 1000,
      price: data.c?.[index] ?? NaN,
    }))
    .filter((point) => Number.isFinite(point.price));
}

export async function getMultipleStockQuotes(
  symbols: string[]
): Promise<Map<string, StockQuote>> {
  const results = new Map<string, StockQuote>();
  const uniqueSymbols = [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))];

  // Fetch in parallel with rate limiting consideration
  const batchSize = 10; // Process 10 at a time to stay within rate limits

  for (let i = 0; i < uniqueSymbols.length; i += batchSize) {
    const batch = uniqueSymbols.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (symbol) => {
        const quote = await getStockQuote(symbol);
        if (quote) {
          results.set(symbol, quote);
        }
      })
    );

    // Small delay between batches to reduce burst limits
    if (i + batchSize < uniqueSymbols.length) {
      await sleep(100);
    }
  }

  return results;
}
