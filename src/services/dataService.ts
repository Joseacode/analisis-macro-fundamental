// src/services/dataService.ts

// 🔑 API KEY DE FRED (32 caracteres)
const FRED_API_KEY: string = 'ba116f995a45a526439456c54eae6d6b';
const DEFAULT_KEY: string = 'your_api_key_here';

// 🔄 Usa proxy local en desarrollo
const API_BASE = import.meta.env.DEV ? '/api/fred' : 'https://api.stlouisfed.org/fred';

const FRED_SERIES = {
    gdp: 'A191RL1Q225SBEA',
    cpi: 'CPIAUCSL',
    unemployment: 'UNRATE',
    yield10Y: 'DGS10',
    yield2Y: 'DGS2',
    fedFunds: 'DFF',
    vix: 'VIXCLS', // ✅ VIX Index
    dollarIndex: 'DTWEXBGS', // ✅ Dollar Index (Broad)
    oilPrice: 'DCOILWTICO', // ✅ WTI Crude Oil
} as const;

// Credit spread: BAA - 10Y (bps)
const FRED_SERIES_BAA = 'BAA';

interface MacroData {
    gdp: number | null;
    cpi: number | null;
    unemployment: number | null;
    yield10Y: number | null;
    yield2Y: number | null;
    fedFundsRate: number | null;
    vix: number | null;
    dollarIndex: number | null;
    oilPrice: number | null;

    // ✅ nuevo (bps)
    creditSpread?: number | null;

    timestamp: string;
}

interface FredResponse {
    observations: Array<{
        date: string;
        value: string;
    }>;
}

interface HistoricalDataPoint {
    date: string;
    value: number;
}

export interface FredLatestPoint {
    date: string;
    value: number | null;
}

function safeDate(d: string | null | undefined) {
    return d ?? '';
}

function pickMinISODate(a?: string | null, b?: string | null): string {
    const aa = (a ?? '').trim();
    const bb = (b ?? '').trim();
    if (!aa) return bb || '';
    if (!bb) return aa || '';
    // ISO yyyy-mm-dd se puede comparar string
    return aa <= bb ? aa : bb;
}

async function fetchFredSeries(seriesId: string, limit: number = 1): Promise<FredLatestPoint> {
    if (!FRED_API_KEY || FRED_API_KEY === DEFAULT_KEY) {
        return { date: '', value: null };
    }

    try {
        const params = new URLSearchParams({
            series_id: seriesId,
            api_key: FRED_API_KEY,
            file_type: 'json',
            sort_order: 'desc',
            limit: limit.toString(),
        });

        const url = `${API_BASE}/series/observations?${params.toString()}`;
        console.log(`📡 Fetching ${seriesId}...`);

        const response = await fetch(url);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ FRED API error for ${seriesId}:`, {
                status: response.status,
                error: errorText.substring(0, 200),
            });
            return { date: '', value: null };
        }

        const data: FredResponse = await response.json();

        if (data.observations && data.observations.length > 0) {
            const obs = data.observations[0];

            // FRED a veces devuelve "." cuando no hay dato válido
            const raw = (obs.value ?? '').trim();
            const value = raw === '.' || raw === '' ? NaN : parseFloat(raw);

            const parsed = !isNaN(value) ? value : null;
            console.log(`✅ ${seriesId}:`, parsed, `as of ${obs.date}`);
            return { date: obs.date, value: parsed };
        }

        return { date: '', value: null };
    } catch (error) {
        console.error(`❌ Error fetching ${seriesId}:`, error);
        return { date: '', value: null };
    }
}

// ✅ Nuevo: calcular credit spread (bps) = (BAA - 10Y) * 100
async function fetchCreditSpreadBps(y10: FredLatestPoint): Promise<{ value: number | null; asOf: string }> {
    // BAA (Moody's Seasoned Baa Corporate Bond Yield)
    const baa = await fetchFredSeries(FRED_SERIES_BAA);

    if (baa.value == null || y10.value == null) {
        return { value: null, asOf: pickMinISODate(baa.date, y10.date) };
    }

    const spreadBps = (baa.value - y10.value) * 100;
    const rounded = Number.isFinite(spreadBps) ? parseFloat(spreadBps.toFixed(2)) : null;

    return {
        value: rounded,
        asOf: pickMinISODate(baa.date, y10.date),
    };
}

// Nueva función: Obtener datos históricos (por rango de fechas real)
export async function fetchHistoricalData(
    seriesId: string,
    days: number = 90,
    opts?: { units?: string }
): Promise<HistoricalDataPoint[]> {
    if (!FRED_API_KEY || FRED_API_KEY === DEFAULT_KEY) {
        return [];
    }

    try {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - days);

        const observation_start = start.toISOString().slice(0, 10);
        const observation_end = end.toISOString().slice(0, 10);

        const params = new URLSearchParams({
            series_id: seriesId,
            api_key: FRED_API_KEY,
            file_type: 'json',
            sort_order: 'asc',
            observation_start,
            observation_end,
        });

        if (opts?.units) params.set('units', opts.units);

        const url = `${API_BASE}/series/observations?${params.toString()}`;
        const response = await fetch(url);

        if (!response.ok) {
            console.error(`❌ Historical data error for ${seriesId}`);
            return [];
        }

        const data: FredResponse = await response.json();

        if (!data.observations) return [];

        return data.observations
            .map((obs) => ({
                date: obs.date,
                value: parseFloat(obs.value),
            }))
            .filter((p) => Number.isFinite(p.value));
    } catch (error) {
        console.error(`❌ Error fetching historical data for ${seriesId}:`, error);
        return [];
    }
}

async function fetchCPIInflation(): Promise<FredLatestPoint> {
    if (!FRED_API_KEY || FRED_API_KEY === DEFAULT_KEY) {
        return { date: '', value: null };
    }

    try {
        const params = new URLSearchParams({
            series_id: 'CPIAUCSL',
            api_key: FRED_API_KEY,
            file_type: 'json',
            sort_order: 'desc',
            limit: '13',
        });

        const url = `${API_BASE}/series/observations?${params.toString()}`;
        const response = await fetch(url);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ CPI API error:', errorText.substring(0, 200));
            return { date: '', value: null };
        }

        const data: FredResponse = await response.json();

        if (data.observations && data.observations.length >= 13) {
            const currentObs = data.observations[0];
            const yearAgoObs = data.observations[12];

            const current = parseFloat(currentObs.value);
            const yearAgo = parseFloat(yearAgoObs.value);

            if (!isNaN(current) && !isNaN(yearAgo) && yearAgo !== 0) {
                const inflation = ((current - yearAgo) / yearAgo) * 100;
                const val = parseFloat(inflation.toFixed(2));
                console.log(`✅ CPI Inflation: ${val}% as of ${currentObs.date}`);
                return { date: currentObs.date, value: val };
            }
        }

        return { date: '', value: null };
    } catch (error) {
        console.error('❌ Error calculating CPI inflation:', error);
        return { date: '', value: null };
    }
}

export async function fetchLatestMacroData(): Promise<MacroData & { asOf: Record<string, string> }> {
    const hasApiKey = FRED_API_KEY && FRED_API_KEY !== DEFAULT_KEY;

    if (!hasApiKey) {
        console.warn('⚠️  No API key configured. Using mock data.');
        const mock = getMockMacroData();
        return {
            ...mock,
            asOf: {},
        };
    }

    console.log('🔄 Fetching latest macro data from FRED API...');
    console.log('🔑 API Key configured:', FRED_API_KEY.length, 'chars');

    try {
        const [gdpP, cpiP, unrateP, y10P, y2P, fedP, vixP, dxyP, oilP] = await Promise.all([
            fetchFredSeries(FRED_SERIES.gdp),
            fetchCPIInflation(),
            fetchFredSeries(FRED_SERIES.unemployment),
            fetchFredSeries(FRED_SERIES.yield10Y),
            fetchFredSeries(FRED_SERIES.yield2Y),
            fetchFredSeries(FRED_SERIES.fedFunds),
            fetchFredSeries(FRED_SERIES.vix),
            fetchFredSeries(FRED_SERIES.dollarIndex),
            fetchFredSeries(FRED_SERIES.oilPrice),
        ]);

        const allNull = gdpP.value === null && cpiP.value === null && unrateP.value === null;

        if (allNull) {
            console.warn('⚠️  All values are null. Check API key or API status.');
            console.log('📊 Falling back to mock data');
            const mock = getMockMacroData();
            return { ...mock, asOf: {} };
        }

        // ✅ Credit spread (BAA - 10Y) bps
        const cs = await fetchCreditSpreadBps(y10P);
        console.log(`✅ Credit Spread (BAA-10Y): ${cs.value} bps as of ${cs.asOf}`);

        console.log('✅ Data fetched successfully from FRED');

        const mock = getMockMacroData();

        return {
            gdp: gdpP.value ?? mock.gdp,
            cpi: cpiP.value ?? mock.cpi,
            unemployment: unrateP.value ?? mock.unemployment,
            yield10Y: y10P.value ?? mock.yield10Y,
            yield2Y: y2P.value ?? mock.yield2Y,
            fedFundsRate: fedP.value ?? mock.fedFundsRate,
            vix: vixP.value ?? mock.vix,
            dollarIndex: dxyP.value ?? mock.dollarIndex,
            oilPrice: oilP.value ?? mock.oilPrice,

            // ✅ nuevo
            creditSpread: cs.value ?? null,

            timestamp: new Date().toISOString(),
            asOf: {
                gdp: safeDate(gdpP.date),
                cpi: safeDate(cpiP.date),
                unemployment: safeDate(unrateP.date),
                yield10Y: safeDate(y10P.date),
                yield2Y: safeDate(y2P.date),
                fedFunds: safeDate(fedP.date),
                vix: safeDate(vixP.date),
                dollarIndex: safeDate(dxyP.date),
                oilPrice: safeDate(oilP.date),

                // ✅ nuevo
                creditSpread: safeDate(cs.asOf),
            },
        };
    } catch (error) {
        console.error('❌ Error fetching from FRED API:', error);
        console.log('📊 Falling back to mock data');
        const mock = getMockMacroData();
        return { ...mock, asOf: {} };
    }
}

export function getMockMacroData(): MacroData {
    return {
        gdp: 2.7,
        cpi: 3.2,
        unemployment: 4.4,
        yield10Y: 4.29,
        yield2Y: 3.59,
        fedFundsRate: 4.25,
        vix: 19.5,
        dollarIndex: 109.2,
        oilPrice: 75.8,

        // ✅ nuevo (bps ejemplo)
        creditSpread: 120,

        timestamp: new Date().toISOString(),
    };
}

// Exportar series para uso en gráficos
export { FRED_SERIES };
