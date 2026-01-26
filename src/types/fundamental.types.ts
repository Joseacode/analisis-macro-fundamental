// src/types/fundamental.types.ts
import type { SectorCode } from './macro.types';

export type FundamentalsSource = 'MOCK' | 'API';

export interface FundamentalSnapshot {
    ticker: string;
    name: string;
    sector: SectorCode;

    // Pricing / valuation
    price: number | null;
    beta: number | null;
    pe: number | null;
    pb: number | null;         // ✅ agregado
    ps: number | null;
    evEbitda: number | null;
    marketCap: number | null;

    // Margins
    grossMargin: number | null; // ✅ agregado
    operatingMargin: number | null;
    netMargin: number | null;   // ✅ agregado

    // Health / returns
    currentRatio: number | null;
    debtToEquity: number | null;
    roe: number | null;

    // Growth
    epsGrowthYoY: number | null;
    revenueGrowthYoY: number | null;

    // provenance
    asOf: string;
    source: FundamentalsSource;
}

export interface SectorFundamentalsResponse {
    items: FundamentalSnapshot[];
    asOf: string;
    source: FundamentalsSource;
}
