// src/services/fundamentalService.ts
import type {
    FundamentalSnapshot,
    SectorEtfSymbol,
    SectorFundamentalsResponse,
    FundamentalSource,
} from '../types/fundamental.types';

const FMP_API_KEY: string = import.meta.env.VITE_FMP_API_KEY ?? '';
const DEFAULT_KEY = 'your_api_key_here';

const API_BASE_STABLE = import.meta.env.DEV
    ? '/api/fmp'
    : 'https://financialmodelingprep.com/stable';

const API_BASE_V3 = import.meta.env.DEV
    ? '/api/fmpv3'
    : 'https://financialmodelingprep.com/api/v3';

const HAS_KEY = Boolean(FMP_API_KEY) && FMP_API_KEY !== DEFAULT_KEY;

type FmpQuoteRow = {
    symbol: string;
    name?: string;
    price?: number;
    marketCap?: number;
    currency?: string;
    timestamp?: number;
};

type FmpRatiosRow = {
    date?: string;
    priceEarningsRatio?: number;
    priceToBookRatio?: number;
    priceToSalesRatio?: number;
    debtEquityRatio?: number;
    currentRatio?: number;
    quickRatio?: number;
};

type FmpKeyMetricsRow = {
    date?: string;
    peRatioTTM?: number;
    priceToSalesRatioTTM?: number;
    enterpriseValueOverEBITDATTM?: number;

    grossProfitMarginTTM?: number;
    operatingProfitMarginTTM?: number;
    netProfitMarginTTM?: number;

    roeTTM?: number;

    revenueGrowth?: number;
    epsGrowth?: number;
};

type FmpProfileRow = {
    beta?: number;
    sector?: string;
};

// Para holdings (v3 etf-holder suele devolver array)
type FmpHoldingRow = {
    symbol?: string;            // a veces viene como symbol
    asset?: string;             // a veces viene como asset
    name?: string;
    weightPercentage?: number;
    weight?: number;
};

function toNum(v: unknown): number | null {
    if (v == null) return null;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : null;
}

function maybeToPct(v: number | null | undefined): number | null {
    if (v == null) return null;
    if (Math.abs(v) <= 1) return Math.round(v * 10000) / 100; // decimal -> %
    return Math.round(v * 100) / 100;
}

async function fmpGetBase<T>(base: string, path: string, params: Record<string, string>): Promise<T> {
    if (!HAS_KEY) throw new Error('FMP API key missing. Set VITE_FMP_API_KEY in .env.local');

    const qs = new URLSearchParams({ ...params, apikey: FMP_API_KEY });
    const url = `${base}${path}?${qs.toString()}`;

    const res = await fetch(url);
    if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`FMP ${path} failed: ${res.status} ${txt.slice(0, 200)}`);
    }
    return (await res.json()) as T;
}

async function fmpGet<T>(path: string, params: Record<string, string>): Promise<T> {
    return fmpGetBase<T>(API_BASE_STABLE, path, params);
}

async function fmpGetV3<T>(path: string, params: Record<string, string>): Promise<T> {
    return fmpGetBase<T>(API_BASE_V3, path, params);
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
    const out: R[] = new Array(items.length);
    let i = 0;

    const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
        while (true) {
            const idx = i++;
            if (idx >= items.length) break;
            out[idx] = await fn(items[idx]);
        }
    });

    await Promise.all(workers);
    return out;
}

// cache 5m
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { t: number; v: FundamentalSnapshot }>();

function cacheGet(key: string): FundamentalSnapshot | null {
    const hit = cache.get(key);
    if (!hit) return null;
    if (Date.now() - hit.t > CACHE_TTL_MS) {
        cache.delete(key);
        return null;
    }
    return hit.v;
}
function cacheSet(key: string, v: FundamentalSnapshot) {
    cache.set(key, { t: Date.now(), v });
}

async function fetchQuote(symbol: string) {
    const data = await fmpGet<FmpQuoteRow[]>('/quote', { symbol });
    const row = Array.isArray(data) ? data[0] ?? null : null;
    const asOf = row?.timestamp
        ? new Date(row.timestamp * 1000).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);
    return { row, asOf };
}

async function fetchRatios(symbol: string) {
    const data = await fmpGet<FmpRatiosRow[]>('/ratios', { symbol, limit: '1' });
    const row = Array.isArray(data) ? data[0] ?? null : null;
    return { row, asOf: row?.date ?? null };
}

async function fetchKeyMetricsTTM(symbol: string) {
    const data = await fmpGet<FmpKeyMetricsRow[]>('/key-metrics-ttm', { symbol });
    const row = Array.isArray(data) ? data[0] ?? null : null;
    return { row, asOf: row?.date ?? null };
}

async function fetchKeyMetricsFallback(symbol: string) {
    const data = await fmpGet<FmpKeyMetricsRow[]>('/key-metrics', { symbol, limit: '1' });
    const row = Array.isArray(data) ? data[0] ?? null : null;
    return { row, asOf: row?.date ?? null };
}

async function fetchProfile(symbol: string) {
    const data = await fmpGet<FmpProfileRow[]>('/profile', { symbol });
    return Array.isArray(data) ? data[0] ?? null : null;
}

async function fetchEtfHoldings(etfSymbol: string) {
    // ✅ USAR V3 (legacy) en lugar de /stable/etf/holdings
    // GET /api/v3/etf-holder/{ETF}
    const data = await fmpGetV3<any>(`/etf-holder/${encodeURIComponent(etfSymbol)}`, {});

    let rows: FmpHoldingRow[] = [];
    if (Array.isArray(data)) rows = data as FmpHoldingRow[];
    else if (data?.holdings && Array.isArray(data.holdings)) rows = data.holdings as FmpHoldingRow[];
    else if (data?.data && Array.isArray(data.data)) rows = data.data as FmpHoldingRow[];

    const asOf = new Date().toISOString().slice(0, 10);
    return { rows, asOf };
}

function makeEmptySnapshot(symbol: string, source: FundamentalSource): FundamentalSnapshot {
    const upper = symbol.toUpperCase();
    return {
        symbol: upper,
        ticker: upper,
        sector: null,
        beta: null,

        pe: null,
        pb: null,
        ps: null,
        evEbitda: null,

        roe: null,
        grossMargin: null,
        operatingMargin: null,
        netMargin: null,

        asOf: null,
        source,
    };
}

export async function fetchFundamentals(symbol: string): Promise<FundamentalSnapshot> {
    const upper = symbol.toUpperCase();
    const key = `fund:${upper}`;
    const cached = cacheGet(key);
    if (cached) return cached;

    if (!HAS_KEY) {
        const mock = makeEmptySnapshot(upper, 'MOCK');
        cacheSet(key, mock);
        return mock;
    }

    const [{ row: quote, asOf: quoteAsOf }, profile] = await Promise.all([
        fetchQuote(upper),
        fetchProfile(upper).catch(() => null),
    ]);

    // Key Metrics TTM con fallback
    let km: FmpKeyMetricsRow | null = null;
    let kmAsOf: string | null = null;
    try {
        const r = await fetchKeyMetricsTTM(upper);
        km = r.row;
        kmAsOf = r.asOf;
    } catch {
        const r2 = await fetchKeyMetricsFallback(upper).catch(() => ({ row: null, asOf: null }));
        km = r2.row;
        kmAsOf = r2.asOf;
    }

    const { row: ratios, asOf: ratiosAsOf } = await fetchRatios(upper).catch(() => ({ row: null, asOf: null }));

    // múltiplos (pb viene de ratios)
    const peTTM = toNum(km?.peRatioTTM ?? ratios?.priceEarningsRatio);
    const pb = toNum(ratios?.priceToBookRatio);
    const psTTM = toNum(km?.priceToSalesRatioTTM ?? ratios?.priceToSalesRatio);
    const evToEbitdaTTM = toNum(km?.enterpriseValueOverEBITDATTM);

    // márgenes (%)
    const grossMarginTTM = maybeToPct(toNum(km?.grossProfitMarginTTM));
    const operatingMarginTTM = maybeToPct(toNum(km?.operatingProfitMarginTTM));
    const netMarginTTM = maybeToPct(toNum(km?.netProfitMarginTTM));
    const roeTTM = maybeToPct(toNum(km?.roeTTM));

    const snap: FundamentalSnapshot = {
        symbol: upper,
        ticker: upper,

        sector: profile?.sector ?? null,
        beta: toNum(profile?.beta),

        name: quote?.name ?? null,
        price: toNum(quote?.price),
        marketCap: toNum(quote?.marketCap),
        currency: quote?.currency ?? null,

        // UI fields (legacy)
        pe: peTTM,
        pb,
        ps: psTTM,
        evEbitda: evToEbitdaTTM,
        roe: roeTTM,
        grossMargin: grossMarginTTM,
        operatingMargin: operatingMarginTTM,
        netMargin: netMarginTTM,

        // extras
        debtToEquity: toNum(ratios?.debtEquityRatio),
        currentRatio: toNum(ratios?.currentRatio),
        quickRatio: toNum(ratios?.quickRatio),

        revenueGrowthYoY: maybeToPct(toNum(km?.revenueGrowth)),
        epsGrowthYoY: maybeToPct(toNum(km?.epsGrowth)),

        // TTM (por si lo querés explícito)
        peTTM,
        pbTTM: pb,
        psTTM,
        evToEbitdaTTM,
        roeTTM,
        grossMarginTTM,
        operatingMarginTTM,
        netMarginTTM,

        asOf: kmAsOf ?? ratiosAsOf ?? quoteAsOf ?? null,
        asOfDetails: {
            quote: quoteAsOf ?? null,
            fundamentals: kmAsOf ?? ratiosAsOf ?? null,
        },

        source: 'FMP',
    };

    cacheSet(key, snap);
    return snap;
}

export async function fetchSectorFundamentals(
    sectorEtf: SectorEtfSymbol,
    opts?: { top?: number; concurrency?: number }
): Promise<SectorFundamentalsResponse> {
    if (!HAS_KEY) {
        return { sector: sectorEtf, items: [], asOf: null, source: 'MOCK' };
    }

    const top = opts?.top ?? 15;
    const concurrency = opts?.concurrency ?? 5;

    const { rows: holdings, asOf: holdingsAsOf } = await fetchEtfHoldings(sectorEtf);

    const symbols = holdings
        .map((h) => (h.symbol ?? h.asset ?? '').toUpperCase().trim())
        .filter(Boolean)
        .slice(0, top);

    const items = await mapLimit(symbols, concurrency, async (sym) => {
        const s = await fetchFundamentals(sym);
        return {
            ...s,
            sector: s.sector ?? sectorEtf,
            asOfDetails: { ...s.asOfDetails, holdings: holdingsAsOf },
        };
    });

    const asOf = items.find((x) => x.asOf)?.asOf ?? null;
    return { sector: sectorEtf, items, asOf, source: 'FMP' };
}
