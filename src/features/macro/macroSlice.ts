// src/features/macro/macroSlice.ts
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type {
    MacroState,
    MacroInputs,
    RegimeType,
    SectorAllocation,
    SectorCode,
} from '../../types/macro.types';
import { REGIME_RECOMMENDATIONS, SECTORS } from '../../utils/constants';
import { fetchLatestMacroData, getMockMacroData } from '../../services/dataService';

// Tipo para los datos que llegan del servicio (nombres "service-friendly")
interface MacroDataPayload {
    gdp: number | null;
    cpi: number | null;
    unemployment: number | null;
    yield10Y: number | null;
    yield2Y: number | null;
    asOf?: Record<string, string>;


    // Service naming
    fedFundsRate: number | null;
    dollarIndex: number | null;
    oilPrice: number | null;

    vix: number | null;
    creditSpread?: number | null;

    timestamp: string;

    // (Opcional) por si en algún momento el service devolviera los aliases directo
    fedFunds?: number | null;
    dxy?: number | null;
    oilWTI?: number | null;
}

const initialState: MacroState = {
    inputs: {
        // core
        gdp: null,
        cpi: null,
        unemployment: null,
        yield10Y: null,
        yield2Y: null,

        // canonical (service)
        fedFundsRate: null,
        dollarIndex: null,
        oilPrice: null,

        // UI aliases (los que mostrás en tarjetas)
        fedFunds: null,
        dxy: null,
        oilWTI: null,

        // otros
        vix: null,
        creditSpread: null,
    },
    analysis: {
        regime: null,
        score: 0,
        confidence: 'LOW',
        yieldCurveSpread: null,
        lastUpdated: null,
    },
    sectorAllocations: [],
    indicators: [],
    loading: false,
    error: null,
    lastUpdated: null,
};

const macroSlice = createSlice({
    name: 'macro',
    initialState,
    reducers: {
        updateInput: (state, action: PayloadAction<{ key: keyof MacroInputs; value: number | null }>) => {
            const { key, value } = action.payload;
            state.inputs[key] = value;

            // Sync canonical <-> alias
            if (key === 'fedFundsRate') state.inputs.fedFunds = value;
            if (key === 'fedFunds') state.inputs.fedFundsRate = value;

            if (key === 'dollarIndex') state.inputs.dxy = value;
            if (key === 'dxy') state.inputs.dollarIndex = value;

            if (key === 'oilPrice') state.inputs.oilWTI = value;
            if (key === 'oilWTI') state.inputs.oilPrice = value;
        },

        updateInputs: (state, action: PayloadAction<Partial<MacroInputs>>) => {
            // Merge seguro: no “pisa” keys que no vienen en el payload
            state.inputs = { ...state.inputs, ...action.payload };

            // Sync canonical <-> alias (si vino alguno en batch)
            if ('fedFundsRate' in action.payload) state.inputs.fedFunds = action.payload.fedFundsRate ?? null;
            if ('fedFunds' in action.payload) state.inputs.fedFundsRate = action.payload.fedFunds ?? null;

            if ('dollarIndex' in action.payload) state.inputs.dxy = action.payload.dollarIndex ?? null;
            if ('dxy' in action.payload) state.inputs.dollarIndex = action.payload.dxy ?? null;

            if ('oilPrice' in action.payload) state.inputs.oilWTI = action.payload.oilPrice ?? null;
            if ('oilWTI' in action.payload) state.inputs.oilPrice = action.payload.oilWTI ?? null;
        },

        calculateRegime: (state) => {
            const { gdp, cpi, unemployment, yield10Y, yield2Y, creditSpread, vix } = state.inputs;

            // ✅ Validar inputs core (sin !gdp porque 0 sería false)
            if (
                gdp == null ||
                cpi == null ||
                unemployment == null ||
                yield10Y == null ||
                yield2Y == null
            ) {
                state.error = 'Missing core inputs: GDP, CPI, Unemployment, 10Y Yield, 2Y Yield';
                return;
            }

            state.error = null;

            // -----------------------------
            // 1) SCORE BASE (0 - 100)
            // -----------------------------
            let baseScore = 0;

            // GDP (0-25)
            if (gdp > 2.5) baseScore += 25;
            else if (gdp > 1.5) baseScore += 15;
            else if (gdp > 0) baseScore += 8;
            else baseScore += 2;

            // CPI (0-25)
            if (cpi >= 2 && cpi <= 3) baseScore += 25;
            else if (cpi > 3 && cpi <= 4) baseScore += 15;
            else if (cpi > 4) baseScore += 5;
            else baseScore += 10;

            // Unemployment (0-25)
            if (unemployment < 4.5) baseScore += 25;
            else if (unemployment < 5.5) baseScore += 18;
            else if (unemployment < 6.5) baseScore += 10;
            else baseScore += 3;

            // Yield curve (0-25)
            const yieldCurveSpread = yield10Y - yield2Y;
            state.analysis.yieldCurveSpread = yieldCurveSpread;

            if (yieldCurveSpread > 0.5) baseScore += 25;
            else if (yieldCurveSpread > 0) baseScore += 15;
            else if (yieldCurveSpread > -0.5) baseScore += 8;
            else baseScore += 2;

            // -----------------------------
            // 2) RISK OVERLAY (penalties)
            //    - Credit Spread en bps
            //    - VIX en puntos
            // -----------------------------
            // Spread: <180 benign, 180-250 caution, >250 stress
            const spreadPenalty =
                creditSpread == null ? 0 : creditSpread > 250 ? 12 : creditSpread >= 180 ? 5 : 0;

            // VIX: <18 benign, 18-25 caution, >25 stress
            const vixPenalty =
                vix == null ? 0 : vix > 25 ? 8 : vix >= 18 ? 3 : 0;

            const adjustedScore = Math.max(
                0,
                Math.min(100, Math.round(baseScore - spreadPenalty - vixPenalty))
            );

            state.analysis.score = adjustedScore;

            // -----------------------------
            // 3) REGIME + CONFIDENCE
            // -----------------------------
            let regime: RegimeType;
            let confidence: 'HIGH' | 'MEDIUM' | 'LOW';

            if (adjustedScore >= 75) {
                regime = 'EXPANSION';
                confidence = adjustedScore >= 85 ? 'HIGH' : 'MEDIUM';
            } else if (adjustedScore >= 50) {
                regime = 'MID-CYCLE';
                confidence = adjustedScore >= 60 ? 'HIGH' : 'MEDIUM';
            } else if (adjustedScore >= 25) {
                regime = 'LATE-CYCLE';
                confidence = adjustedScore >= 35 ? 'MEDIUM' : 'LOW';
            } else {
                regime = 'CONTRACTION';
                confidence = adjustedScore <= 15 ? 'HIGH' : 'MEDIUM';
            }

            state.analysis.regime = regime;
            state.analysis.confidence = confidence;
            state.analysis.lastUpdated = new Date().toISOString();

            // -----------------------------
            // 4) SECTOR ALLOCATIONS
            // -----------------------------
            state.sectorAllocations = generateSectorAllocations(regime);
        },


        loadMacroData: (state, action: PayloadAction<MacroDataPayload>) => {
            const p = action.payload;

            // Normalizamos: si viene por canonical o por alias, llenamos ambos
            const fedFundsRate = p.fedFundsRate ?? p.fedFunds ?? null;
            const dollarIndex = p.dollarIndex ?? p.dxy ?? null;
            const oilPrice = p.oilPrice ?? p.oilWTI ?? null;

            state.inputs = {
                ...state.inputs, // mantiene TODAS las keys del tipo MacroInputs
                gdp: p.gdp,
                cpi: p.cpi,
                unemployment: p.unemployment,
                yield10Y: p.yield10Y,
                yield2Y: p.yield2Y,

                // canonical
                fedFundsRate,
                dollarIndex,
                oilPrice,

                // aliases
                fedFunds: fedFundsRate,
                dxy: dollarIndex,
                oilWTI: oilPrice,

                // extra
                vix: p.vix,
                creditSpread: p.creditSpread ?? state.inputs.creditSpread ?? null,
            };

            state.lastUpdated = p.timestamp;
            state.asOf = p.asOf ?? {};

        },

        clearAllData: (state) => {
            state.inputs = initialState.inputs;
            state.analysis = initialState.analysis;
            state.sectorAllocations = [];
            state.indicators = [];
            state.error = null;
            state.lastUpdated = null;
        },

        setLoading: (state, action: PayloadAction<boolean>) => {
            state.loading = action.payload;
        },

        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
        },
    },
});

function generateSectorAllocations(regime: RegimeType): SectorAllocation[] {
    const recommendation = REGIME_RECOMMENDATIONS[regime];
    const allocations: SectorAllocation[] = [];

    Object.entries(SECTORS).forEach(([code, name]) => {
        const sectorCode = code as SectorCode;

        let bias: 'OVERWEIGHT' | 'NEUTRAL' | 'UNDERWEIGHT';
        let weight: number;

        if (recommendation.overweightSectors.includes(sectorCode)) {
            bias = 'OVERWEIGHT';
            weight = 15;
        } else if (recommendation.underweightSectors.includes(sectorCode)) {
            bias = 'UNDERWEIGHT';
            weight = 3;
        } else {
            bias = 'NEUTRAL';
            weight = 8;
        }

        allocations.push({
            sector: sectorCode,
            sectorName: name,
            bias,
            weight,
        });
    });

    return allocations;
}

export const {
    updateInput,
    updateInputs,
    calculateRegime,
    loadMacroData,
    clearAllData,
    setLoading,
    setError,
} = macroSlice.actions;

export const fetchMacroData = () => async (dispatch: any) => {
    dispatch(setLoading(true));
    dispatch(setError(null));

    try {
        const data = await fetchLatestMacroData();
        dispatch(loadMacroData(data));
        dispatch(calculateRegime());
        return { success: true };
    } catch (error) {
        console.error('Error fetching macro data:', error);

        const mockData = getMockMacroData();
        dispatch(loadMacroData(mockData));
        dispatch(calculateRegime());

        dispatch(setError('Using mock data'));
        return { success: false, error: 'Using mock data' };
    } finally {
        dispatch(setLoading(false));
    }
};

export default macroSlice.reducer;
