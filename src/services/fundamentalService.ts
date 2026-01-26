// src/services/fundamentalService.ts
import type { SectorCode } from '../types/macro.types';
import type {
    FundamentalSnapshot,
    SectorFundamentalsResponse,
    FundamentalsSource,
} from '../types/fundamental.types';

const SECTOR_UNIVERSE: Record<SectorCode, Array<{ ticker: string; name: string }>> = {
    XLK: [
        { ticker: 'AAPL', name: 'Apple' },
        { ticker: 'MSFT', name: 'Microsoft' },
        { ticker: 'NVDA', name: 'NVIDIA' },
        { ticker: 'AVGO', name: 'Broadcom' },
    ],
    XLY: [
        { ticker: 'AMZN', name: 'Amazon' },
        { ticker: 'TSLA', name: 'Tesla' },
        { ticker: 'HD', name: 'Home Depot' },
        { ticker: 'NKE', name: 'Nike' },
    ],
    XLI: [
        { ticker: 'CAT', name: 'Caterpillar' },
        { ticker: 'GE', name: 'GE Aerospace' },
        { ticker: 'HON', name: 'Honeywell' },
        { ticker: 'UPS', name: 'UPS' },
    ],
    XLF: [
        { ticker: 'JPM', name: 'JPMorgan Chase' },
        { ticker: 'BAC', name: 'Bank of America' },
        { ticker: 'WFC', name: 'Wells Fargo' },
        { ticker: 'MS', name: 'Morgan Stanley' },
    ],
    XLE: [
        { ticker: 'XOM', name: 'Exxon Mobil' },
        { ticker: 'CVX', name: 'Chevron' },
        { ticker: 'SLB', name: 'SLB' },
        { ticker: 'COP', name: 'ConocoPhillips' },
    ],
    XLB: [
        { ticker: 'LIN', name: 'Linde' },
        { ticker: 'APD', name: 'Air Products' },
        { ticker: 'ECL', name: 'Ecolab' },
        { ticker: 'NEM', name: 'Newmont' },
    ],
    XLV: [
        { ticker: 'UNH', name: 'UnitedHealth' },
        { ticker: 'JNJ', name: 'Johnson & Johnson' },
        { ticker: 'LLY', name: 'Eli Lilly' },
        { ticker: 'PFE', name: 'Pfizer' },
    ],
    XLP: [
        { ticker: 'PG', name: 'Procter & Gamble' },
        { ticker: 'KO', name: 'Coca-Cola' },
        { ticker: 'PEP', name: 'PepsiCo' },
        { ticker: 'WMT', name: 'Walmart' },
    ],
    XLU: [
        { ticker: 'NEE', name: 'NextEra Energy' },
        { ticker: 'DUK', name: 'Duke Energy' },
        { ticker: 'SO', name: 'Southern Company' },
        { ticker: 'EXC', name: 'Exelon' },
    ],
    XLRE: [
        { ticker: 'PLD', name: 'Prologis' },
        { ticker: 'AMT', name: 'American Tower' },
        { ticker: 'EQIX', name: 'Equinix' },
        { ticker: 'O', name: 'Realty Income' },
    ],
    XLC: [
        { ticker: 'GOOGL', name: 'Alphabet' },
        { ticker: 'META', name: 'Meta Platforms' },
        { ticker: 'NFLX', name: 'Netflix' },
        { ticker: 'DIS', name: 'Disney' },
    ],
};

function hashToUnit(str: string): number {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return (h >>> 0) / 4294967295; // 0..1
}

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

function mockSnapshot(
    sector: SectorCode,
    ticker: string,
    name: string,
    asOf: string,
    source: FundamentalsSource
): FundamentalSnapshot {
    const u = hashToUnit(`${sector}:${ticker}`);

    const price = Math.round((50 + u * 450) * 100) / 100;
    const beta = Math.round(clamp(0.6 + u * 1.4, 0.5, 2.2) * 100) / 100;

    const pe = Math.round(clamp(10 + u * 35, 6, 60) * 10) / 10;
    const pb = Math.round(clamp(1 + u * 9, 0.5, 18) * 10) / 10;
    const ps = Math.round(clamp(1 + u * 14, 0.5, 25) * 10) / 10;
    const evEbitda = Math.round(clamp(6 + u * 18, 4, 35) * 10) / 10;

    const grossMargin = Math.round(clamp(0.25 + u * 0.45, 0.15, 0.8) * 1000) / 10; // %
    const operatingMargin = Math.round(clamp(0.06 + u * 0.34, 0.02, 0.45) * 1000) / 10; // %
    const netMargin = Math.round(clamp(-0.03 + u * 0.28, -0.1, 0.35) * 1000) / 10; // %

    const currentRatio = Math.round(clamp(0.8 + u * 1.8, 0.5, 3.5) * 100) / 100;
    const debtToEquity = Math.round(clamp(0.2 + u * 2.2, 0, 4.0) * 100) / 100;
    const roe = Math.round(clamp(0.06 + u * 0.26, 0, 0.35) * 1000) / 10; // %

    const epsGrowthYoY = Math.round(clamp(-0.15 + u * 0.55, -0.3, 0.6) * 1000) / 10; // %
    const revenueGrowthYoY = Math.round(clamp(-0.05 + u * 0.35, -0.2, 0.4) * 1000) / 10; // %

    const marketCap = Math.round((10 + u * 990) * 1_000_000_000);

    return {
        ticker,
        name,
        sector,

        price,
        beta,
        pe,
        pb,
        ps,
        evEbitda,
        marketCap,

        grossMargin,
        operatingMargin,
        netMargin,

        currentRatio,
        debtToEquity,
        roe,

        epsGrowthYoY,
        revenueGrowthYoY,

        asOf,
        source,
    };
}

export async function fetchFundamentals(sector: SectorCode): Promise<SectorFundamentalsResponse> {
    const source: FundamentalsSource = 'MOCK';
    const asOf = new Date().toISOString().slice(0, 10);

    const universe = SECTOR_UNIVERSE[sector] ?? [];
    const items = universe.map((c) => mockSnapshot(sector, c.ticker, c.name, asOf, source));

    return { items, asOf, source };
}

// compat
export const fetchSectorFundamentals = fetchFundamentals;

export type { FundamentalSnapshot, SectorFundamentalsResponse };
