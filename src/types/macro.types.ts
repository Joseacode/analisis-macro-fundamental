// =========================
// Macro Types
// =========================

// Tipos de régimen
export type RegimeType = 'EXPANSION' | 'MID-CYCLE' | 'LATE-CYCLE' | 'CONTRACTION';

// Tipo de bias sectorial
export type SectorBias = 'OVERWEIGHT' | 'NEUTRAL' | 'UNDERWEIGHT';

// Código de sectores
export type SectorCode =
    | 'XLK'
    | 'XLY'
    | 'XLI'
    | 'XLF'
    | 'XLE'
    | 'XLB'
    | 'XLV'
    | 'XLP'
    | 'XLU'
    | 'XLRE'
    | 'XLC';

// Recomendación por régimen
export interface RegimeRecommendation {
    overweightSectors: SectorCode[];
    underweightSectors: SectorCode[];
    description: string;
}

// =========================
// Inputs (IMPORTANTE)
// =========================
// Mantengo CANONICAL + ALIASES porque tu proyecto ya los usa en varios lugares.
// En el siguiente paso los hacemos "canónicos" (una sola verdad) si querés.
export interface MacroInputs {
    // core
    gdp: number | null;
    cpi: number | null;
    unemployment: number | null;
    yield10Y: number | null;
    yield2Y: number | null;

    // canonical (service)
    fedFundsRate: number | null;
    dollarIndex: number | null;
    oilPrice: number | null;

    // aliases (UI)
    fedFunds: number | null;
    dxy: number | null;
    oilWTI: number | null;

    // extra
    vix: number | null;
    creditSpread: number | null;
}

// Allocación sectorial
export interface SectorAllocation {
    sector: SectorCode;
    sectorName: string;
    bias: SectorBias;
    weight: number;
}

// Estado del slice
export interface MacroState {
    inputs: MacroInputs;
    analysis: {
        regime: RegimeType | null;
        score: number;
        confidence: 'HIGH' | 'MEDIUM' | 'LOW';
        yieldCurveSpread: number | null;
        lastUpdated: string | null;
    };
    sectorAllocations: SectorAllocation[];
    indicators: any[];
    loading: boolean;
    error: string | null;
    lastUpdated: string | null;
}

export interface MacroState {
    inputs: MacroInputs;
    analysis: {
        regime: RegimeType | null;
        score: number;
        confidence: 'HIGH' | 'MEDIUM' | 'LOW';
        yieldCurveSpread: number | null;
        lastUpdated: string | null;
    };
    sectorAllocations: SectorAllocation[];
    indicators: any[];
    loading: boolean;
    error: string | null;
    lastUpdated: string | null;

    // NUEVO:
    asOf?: Record<string, string>;
}
