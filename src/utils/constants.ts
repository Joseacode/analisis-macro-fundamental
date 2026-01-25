// src/utils/constants.ts
import type { RegimeType, SectorCode, RegimeRecommendation, SectorBias } from '../types/macro.types';

// =========================
// SECTORS
// =========================
export const SECTORS: Record<SectorCode, string> = {
    XLK: 'Technology',
    XLY: 'Consumer Discretionary',
    XLI: 'Industrials',
    XLF: 'Financials',
    XLE: 'Energy',
    XLB: 'Materials',
    XLV: 'Healthcare',
    XLP: 'Consumer Staples',
    XLU: 'Utilities',
    XLRE: 'Real Estate',
    XLC: 'Communication Services',
};

// =========================
// SINGLE SOURCE OF TRUTH
// =========================
export const REGIME_MATRIX: Record<
    RegimeType,
    {
        color: string;
        economics: string;
        overweightSectors: SectorCode[];
        underweightSectors: SectorCode[];
        consequence: string;
    }
> = {
    EXPANSION: {
        color: '#00ff88',
        economics: 'Growth strong, labor tight, inflation controlled, curve positive, credit benign',
        overweightSectors: ['XLK', 'XLY', 'XLI', 'XLF'],
        underweightSectors: ['XLP', 'XLU'],
        consequence:
            'Pro-cyclical tilt. Prioritize growth + cyclicals; keep defensives lighter unless risk signals deteriorate.',
    },
    'MID-CYCLE': {
        color: '#00d9ff',
        economics: 'Growth steady, inflation normalizing, policy neutral, curve flattening begins',
        overweightSectors: ['XLK', 'XLF', 'XLI', 'XLB'],
        underweightSectors: ['XLU', 'XLP'],
        consequence:
            'Quality cyclicals + GARP. Monitor late-cycle signals (curve, spreads, volatility).',
    },
    'LATE-CYCLE': {
        color: '#ffbb00',
        economics: 'Growth slowing, inflation pressure, policy restrictive, curve flat/inverting, credit tightening',
        overweightSectors: ['XLE', 'XLB', 'XLV', 'XLP'],
        underweightSectors: ['XLK', 'XLY', 'XLRE'],
        consequence:
            'Defensive rotation + inflation hedges. Reduce duration-sensitive and discretionary risk.',
    },
    CONTRACTION: {
        color: '#ff4444',
        economics: 'Growth weak/recession, unemployment rising, credit stress, volatility elevated',
        overweightSectors: ['XLV', 'XLP', 'XLU'],
        underweightSectors: ['XLY', 'XLI', 'XLF', 'XLE', 'XLB', 'XLRE'],
        consequence:
            'Capital preservation. Defensives + cash bias; only add cyclicals when leading indicators turn.',
    },
};

// =========================
// DERIVED: REGIME RECOMMENDATIONS
// (prevents contradictions with matrix)
// =========================
export const REGIME_RECOMMENDATIONS: Record<RegimeType, RegimeRecommendation> = {
    EXPANSION: {
        overweightSectors: REGIME_MATRIX.EXPANSION.overweightSectors,
        underweightSectors: REGIME_MATRIX.EXPANSION.underweightSectors,
        description: 'Pro-cyclical growth tilt.',
    },
    'MID-CYCLE': {
        overweightSectors: REGIME_MATRIX['MID-CYCLE'].overweightSectors,
        underweightSectors: REGIME_MATRIX['MID-CYCLE'].underweightSectors,
        description: 'Quality cyclicals + GARP.',
    },
    'LATE-CYCLE': {
        overweightSectors: REGIME_MATRIX['LATE-CYCLE'].overweightSectors,
        underweightSectors: REGIME_MATRIX['LATE-CYCLE'].underweightSectors,
        description: 'Defensive rotation + inflation hedges.',
    },
    CONTRACTION: {
        overweightSectors: REGIME_MATRIX.CONTRACTION.overweightSectors,
        underweightSectors: REGIME_MATRIX.CONTRACTION.underweightSectors,
        description: 'Preservation mode.',
    },
};

// =========================
// COLORS
// =========================
export const REGIME_COLORS: Record<RegimeType, string> = {
    EXPANSION: REGIME_MATRIX.EXPANSION.color,
    'MID-CYCLE': REGIME_MATRIX['MID-CYCLE'].color,
    'LATE-CYCLE': REGIME_MATRIX['LATE-CYCLE'].color,
    CONTRACTION: REGIME_MATRIX.CONTRACTION.color,
};

export const BIAS_COLORS: Record<SectorBias, string> = {
    OVERWEIGHT: '#00ff88',
    NEUTRAL: '#ffbb00',
    UNDERWEIGHT: '#ff4444',
};
