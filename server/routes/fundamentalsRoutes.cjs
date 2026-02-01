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
        try {
            const sym = req.params.ticker.toUpperCase();
            const limit = Math.min(Number(req.query.limit) || 16, 40);

            console.log(`[Fundamentals] Fetching series for ${sym}, limit=${limit}`);

            // 1. Resolver CIK desde ticker
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
            const cf = await fetchCompanyFacts(cik10);

            console.log(`[Fundamentals] CompanyFacts fetched for ${sym}`);

            // 3. Extraer serie (ahora devuelve objeto con series + debug)
            const result = extractSeriesFromCompanyFacts(sym, cf, limit);

            // Extraer series y latestEndAll del resultado
            const series = Array.isArray(result) ? result : (result?.series || []);
            const latestEndAll = Array.isArray(result) ? null : (result?.latestEndAll || null);

            if (!series || series.length === 0) {
                return res.status(404).json({
                    ok: false,
                    ticker: sym,
                    error: 'No quarterly data found',
                    series: [],
                    _debug: {
                        latestEndAll: latestEndAll,
                        latestRevenueEnd: cf?.debug_fetch?.latestRevenueEnd || null,
                        url: cf?.debug_fetch?.url || null
                    }
                });
            }

            console.log(`[Fundamentals] Extracted ${series.length} quarters for ${sym}`);

            // 4. Calcular stats de validación
            const mismatchCount = series.filter(s =>
                s.warnings?.includes('period_id_mismatch_sec_vs_derived')
            ).length;

            const delayedFilings = series.filter(s =>
                s.warnings?.some(w => w.startsWith('filing_delayed'))
            ).length;

            const earlyFilings = series.filter(s =>
                s.warnings?.includes('filing_before_quarter_end')
            ).length;

            // 5. Respuesta con series y metadata
            res.json({
                ok: true,
                ticker: sym,
                cik: cik10,
                currency: 'USD',
                scaling: 'raw',
                series: series, // Array directo de bundles
                _debug: {
                    periods_found: series.length,
                    period_id_mismatches: mismatchCount,
                    delayed_filings: delayedFilings,
                    early_filings: earlyFilings,
                    fiscal_year_end_month: series[0]?.period?.fiscal_year_end_month || null,
                    latestEndAll: latestEndAll,
                    latestRevenueEnd: cf?.debug_fetch?.latestRevenueEnd || null,
                    url: cf?.debug_fetch?.url || null
                }
            });

        } catch (e) {
            console.error('[Fundamentals] ERROR en /fundamentals/series:', e.message);
            console.error(e.stack);

            res.status(500).json({
                ok: false,
                error: 'Fundamentals series error',
                detail: String(e?.message ?? e)
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
            const result = extractSeriesFromCompanyFacts(sym, cf, 1);

            const series = Array.isArray(result) ? result : (result?.series || []);

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
            const result = extractSeriesFromCompanyFacts(sym, cf, 40); // Traer más para buscar

            const series = Array.isArray(result) ? result : (result?.series || []);

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
