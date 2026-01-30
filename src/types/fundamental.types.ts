// src/types/fundamental.types.ts
export type SectorEtfSymbol =
    | 'XLK' | 'XLY' | 'XLI' | 'XLF' | 'XLE' | 'XLB' | 'XLV' | 'XLP' | 'XLU' | 'XLRE' | 'XLC';

export type FundamentalSource = 'FMP' | 'MOCK';

export interface FundamentalSnapshot {
    // identidad (requeridas)
    symbol: string;
    ticker: string;

    // clasificación (recomendado para UI)
    sector: string | null;
    epsTTM?: number | null;
    // mercado (opcionales pero útiles)
    name?: string | null;
    price?: number | null;
    marketCap?: number | null;
    currency?: string | null;

    // riesgo
    beta: number | null;

    // múltiplos (UI usa estos nombres)
    pe: number | null;
    pb: number | null;
    ps: number | null;
    evEbitda: number | null;

    // rentabilidad/márgenes (en %)
    roe: number | null;
    grossMargin: number | null;
    operatingMargin: number | null;
    netMargin: number | null;

    // opcional: extra ratios
    debtToEquity?: number | null;
    currentRatio?: number | null;
    quickRatio?: number | null;

    // opcional: crecimiento (en %)
    revenueGrowthYoY?: number | null;
    epsGrowthYoY?: number | null;

    // opcional: versión TTM (si querés usarlo más adelante)
    peTTM?: number | null;
    pbTTM?: number | null;
    psTTM?: number | null;
    evToEbitdaTTM?: number | null;
    roeTTM?: number | null;
    grossMarginTTM?: number | null;
    operatingMarginTTM?: number | null;
    netMarginTTM?: number | null;

    // fechas
    asOf: string | null;
    asOfDetails?: {
        quote?: string | null;
        fundamentals?: string | null;
        holdings?: string | null;
    };

    // fuente
    source: FundamentalSource;
}

export interface SectorFundamentalsResponse {
    sector: SectorEtfSymbol;
    items: FundamentalSnapshot[];
    asOf: string | null;
    source: FundamentalSource;
}

