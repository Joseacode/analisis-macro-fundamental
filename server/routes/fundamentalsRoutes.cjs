/**
 * fundamentalsRoutes.cjs
 * Routes for fundamental analysis data
 */

const {
    resolveCikFromTicker,
    fetchCompanyFacts,
    extractSeriesFromCompanyFacts,
} = require('../services/secCompanyFacts.cjs');

function registerFundamentalsRoutes(app) {
    console.log('✅ Rutas Fundamentals registradas');

    /**
     * GET /api/fundamentals/:ticker/series
     * Returns quarterly financial data series for a ticker
     * 
     * Query params:
     *   - limit: max number of quarters (default: 16, max: 40)
     * 
     * Response:
     *   - series: array of quarterly bundles with reported financials
     *   - _debug: metadata about fiscal periods, mismatches, etc.
     */
    app.get('/api/fundamentals/:ticker/series', async (req, res) => {
        console.log('🚀🚀🚀 NEW ROUTER ENDPOINT HIT 🚀🚀🚀');
        console.log('🚀 Ticker:', req.params.ticker);
        console.log('🚀 Limit:', req.query.limit);
        console.log('🚀 Full URL:', req.originalUrl);

        try {
            const sym = req.params.ticker.toUpperCase();
            const limit = Math.min(Number(req.query.limit) || 16, 40);

            console.log(`[Fundamentals] Fetching series for ${sym}, limit=${limit}`);

            // 1. Resolver CIK desde ticker
            console.log('[ROUTER] Step 1: Resolving CIK...');
            const cik10 = await resolveCikFromTicker(sym);
            if (!cik10) {
                return res.status(404).json({
                    ok: false,
                    ticker: sym,
                    error: 'CIK not found for ticker'
                });
            }

            console.log(`[Fundamentals] CIK resolved: ${cik10}`);

            // 2. Fetch CompanyFacts desde SEC
            console.log('[ROUTER] Step 2: Fetching CompanyFacts...');
            const cf = await fetchCompanyFacts(cik10);

            console.log(`[Fundamentals] CompanyFacts fetched for ${sym}`);

            // 3. Extraer serie (devuelve objeto con series + debug)
            console.log('[ROUTER] Step 3: About to call extractSeriesFromCompanyFacts...');

            let result;
            try {
                result = await extractSeriesFromCompanyFacts(sym, cf, limit);
                console.log('[ROUTER] ✅ extractSeriesFromCompanyFacts returned successfully');
                console.log('[ROUTER] result type:', typeof result);
                console.log('[ROUTER] result is null?:', result === null);
                console.log('[ROUTER] result is undefined?:', result === undefined);

                if (result) {
                    console.log('[ROUTER] result keys:', Object.keys(result));
                    console.log('[ROUTER] result.series exists?:', 'series' in result);
                    console.log('[ROUTER] result.series type:', typeof result?.series);
                    console.log('[ROUTER] result preview:', JSON.stringify(result).substring(0, 300));
                }
            } catch (extractError) {
                console.error('[ROUTER] ❌ extractSeriesFromCompanyFacts FAILED');
                console.error('[ROUTER] Error message:', extractError.message);
                console.error('[ROUTER] Error stack:', extractError.stack);
                throw extractError;
            }

            console.log('[ROUTER] Step 4: Extracting series from result...');

            // ✅ FIX: Extraer series y latestEndAll del resultado
            const series = result?.series || [];
            const latestEndAll = result?.latestEndAll || null;

            console.log('[ROUTER] series extracted, length:', series.length);
            console.log('[ROUTER] series is Array?:', Array.isArray(series));

            if (!series || series.length === 0) {
                console.log('⚠️ [ROUTER] No series found, returning 404');
                return res.status(404).json({
                    ok: false,
                    ticker: sym,
                    error: 'No quarterly data found',
                    series: [],
                    _debug: {
                        latestEndAll: latestEndAll,
                        result_was_null: result === null,
                        result_was_undefined: result === undefined
                    }
                });
            }

            console.log(`[Fundamentals] Extracted ${series.length} quarters for ${sym}`);

            // 4. Calcular stats de validación
            console.log('[ROUTER] Step 5: Calculating validation stats...');

            const mismatchCount = series.filter(s =>
                s.warnings?.includes('period_id_mismatch_sec_vs_derived')
            ).length;

            const delayedFilings = series.filter(s =>
                s.warnings?.some(w => w.startsWith('filing_delayed'))
            ).length;

            const earlyFilings = series.filter(s =>
                s.warnings?.includes('filing_before_quarter_end')
            ).length;

            console.log('[ROUTER] Step 6: Building response object...');

            // 5. Respuesta con series y metadata
            const responseData = {
                ok: true,
                ticker: sym,
                cik: cik10,
                currency: 'USD',
                scaling: 'raw',
                series: series,
                _debug: {
                    periods_found: series.length,
                    period_id_mismatches: mismatchCount,
                    delayed_filings: delayedFilings,
                    early_filings: earlyFilings,
                    fiscal_year_end_month: series[0]?.period?.fiscal_year_end_month || null,
                    latestEndAll: latestEndAll
                }
            };

            console.log('[ROUTER] Response built successfully');
            console.log('[ROUTER] Response.series is array?:', Array.isArray(responseData.series));
            console.log('[ROUTER] Response.series.length:', responseData.series.length);
            console.log('[ROUTER] About to send JSON response...');

            res.json(responseData);

            console.log('[ROUTER] ✅ JSON response sent successfully');

        } catch (e) {
            console.error('[Fundamentals] ❌ ERROR en /fundamentals/series');
            console.error('[Fundamentals] Error message:', e.message);
            console.error('[Fundamentals] Error stack:', e.stack);

            res.status(500).json({
                ok: false,
                error: 'Fundamentals series error',
                detail: String(e?.message ?? e),
                stack: e.stack
            });
        }
    });

    /**
     * GET /api/fundamentals/:ticker/latest
     * Returns only the most recent quarter
     */
    app.get('/api/fundamentals/:ticker/latest', async (req, res) => {
        try {
            const sym = req.params.ticker.toUpperCase();

            const cik10 = await resolveCikFromTicker(sym);
            if (!cik10) {
                return res.status(404).json({
                    ok: false,
                    ticker: sym,
                    error: 'CIK not found for ticker'
                });
            }

            const cf = await fetchCompanyFacts(cik10);
            const result = await extractSeriesFromCompanyFacts(sym, cf, 1);

            // ✅ FIX: Extraer series del resultado
            const series = result?.series || [];

            if (!series || series.length === 0) {
                return res.status(404).json({
                    ok: false,
                    ticker: sym,
                    error: 'No quarterly data found'
                });
            }

            res.json({
                ok: true,
                ticker: sym,
                cik: cik10,
                latest: series[0] // Solo el más reciente
            });

        } catch (e) {
            console.error('[Fundamentals] ERROR en /fundamentals/latest:', e.message);

            res.status(500).json({
                ok: false,
                error: 'Fundamentals latest error',
                detail: String(e?.message ?? e)
            });
        }
    });

    /**
     * GET /api/fundamentals/:ticker/period/:periodId
     * Returns specific quarter by period_id (e.g., FY2026Q2)
     */
    app.get('/api/fundamentals/:ticker/period/:periodId', async (req, res) => {
        try {
            const sym = req.params.ticker.toUpperCase();
            const periodId = req.params.periodId.toUpperCase();

            const cik10 = await resolveCikFromTicker(sym);
            if (!cik10) {
                return res.status(404).json({
                    ok: false,
                    ticker: sym,
                    error: 'CIK not found for ticker'
                });
            }

            const cf = await fetchCompanyFacts(cik10);
            const result = await extractSeriesFromCompanyFacts(sym, cf, 40);

            // ✅ FIX: Extraer series del resultado
            const series = result?.series || [];

            const period = series.find(s => s.period?.period_id === periodId);

            if (!period) {
                return res.status(404).json({
                    ok: false,
                    ticker: sym,
                    period_id: periodId,
                    error: 'Period not found',
                    available_periods: series.map(s => s.period?.period_id).filter(Boolean)
                });
            }

            res.json({
                ok: true,
                ticker: sym,
                cik: cik10,
                period: period
            });

        } catch (e) {
            console.error('[Fundamentals] ERROR en /fundamentals/period:', e.message);

            res.status(500).json({
                ok: false,
                error: 'Fundamentals period error',
                detail: String(e?.message ?? e)
            });
        }
    });
}

module.exports = { registerFundamentalsRoutes };
