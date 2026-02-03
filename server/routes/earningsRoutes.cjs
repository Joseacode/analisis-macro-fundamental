// server/routes/earningsRoutes.cjs

const path = require("path");
const fs = require("fs/promises");

const {
    listFilingFiles,
    pickBestExhibitDoc,
    buildFilingFileUrl,
} = require("../services/secFilingIndex.cjs");

// ✅ Imports para SEC discovery y parsing
const { discoverEarningsFromSEC } = require("../services/secEdgar.cjs");
const { resolveEarningsSource } = require("../services/earningsSourceResolver.cjs");
const { buildSecPrimaryDocUrl, fetchSecDocumentText } = require("../services/secArchives.cjs");
const { extractBundleFromInlineXbrl } = require("../services/inlineXbrlParser.cjs");
const {
    resolveCikFromTicker,
    fetchCompanyFacts,
    extractBundleFromCompanyFacts,
    extractSeriesFromCompanyFacts
} = require("../services/secCompanyFacts.cjs");

// Lee JSON mock una vez por request (simple). Luego optimizamos con cache en memoria.
const MOCK_FILE = path.resolve(__dirname, "..", "data", "earningsMock.json");

async function readMock() {
    const txt = await fs.readFile(MOCK_FILE, "utf-8");
    return JSON.parse(txt);
}

// ========================================
// ✅ HELPERS UTILS
// ========================================

function safeNum(v) {
    return typeof v === "number" && Number.isFinite(v) ? v : null;
}
function pct(a, b) {
    if (a == null || b == null || b === 0) return null;
    return (a / b) * 100;
}
function div(a, b) {
    if (a == null || b == null || b === 0) return null;
    return a / b;
}

function round2(n) {
    return typeof n === "number" && Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

function fmtPct(n) {
    if (n == null) return null;
    return `${round2(n).toFixed(2)}%`;
}

function fmtX(n) {
    if (n == null) return null;
    return `${round2(n).toFixed(2)}x`;
}

function computeFCF(ocf, capex) {
    if (ocf == null || capex == null) return null;
    return capex < 0 ? ocf + capex : ocf - capex;
}

// ========================================
// ✅ HELPERS: Detección y parsing HTML
// ========================================

function hasInlineXbrl(html) {
    if (!html) return false;
    // ✅ Buscar tags ix: en general (case insensitive)
    return /<ix:[a-z]/i.test(html);
}

function hasHtmlTables(html) {
    if (!html) return false;
    return /<table\b/i.test(html);
}

function extractBasicFromHtml(html) {
    // ✅ Extraer el texto limpio
    const text = String(html)
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const parseMoney = (s, unit = "million") => {
        if (!s) return null;
        // ✅ Buscar números con formato: "81.3 billion" o "69,628" o "69628"
        const m = String(s).match(/-?\(?\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)\)?/);
        if (!m) return null;
        let v = m[1];
        const neg = s.includes("(") && s.includes(")");
        v = v.replace(/,/g, "");
        let n = Number(v);
        if (!Number.isFinite(n)) return null;

        // ✅ Convertir billions a millions
        if (unit === "billion") {
            n = n * 1000;
        }

        return neg ? -n : n;
    };

    // ✅ Extraer Revenue
    let revenue = null;
    const revenueMatch = text.match(/revenue\s+was\s+\$\s*([\d.]+)\s+billion/i);
    if (revenueMatch) {
        revenue = parseMoney(revenueMatch[1], "billion");
    } else {
        // Fallback: buscar formato con millones
        const revPatterns = [
            /revenue\s+(?:\$\s*)?(\d{1,3}(?:,\d{3})+|\d{4,})/i,
            /total\s+revenue\s+(?:\$\s*)?(\d{1,3}(?:,\d{3})+|\d{4,})/i,
        ];
        for (const pattern of revPatterns) {
            const match = text.match(pattern);
            if (match) {
                revenue = parseMoney(match[1], "million");
                if (revenue) break;
            }
        }
    }

    // ✅ Extraer Operating Income
    let opIncome = null;
    const opMatch = text.match(/operating\s+income\s+was\s+\$\s*([\d.]+)\s+billion/i);
    if (opMatch) {
        opIncome = parseMoney(opMatch[1], "billion");
    } else {
        const opPatterns = [
            /operating\s+income\s+(?:\$\s*)?(\d{1,3}(?:,\d{3})+|\d{4,})/i,
            /income\s+from\s+operations\s+(?:\$\s*)?(\d{1,3}(?:,\d{3})+|\d{4,})/i,
        ];
        for (const pattern of opPatterns) {
            const match = text.match(pattern);
            if (match) {
                opIncome = parseMoney(match[1], "million");
                if (opIncome) break;
            }
        }
    }

    // ✅ Extraer Net Income (usar non-GAAP si está disponible, sino GAAP)
    let netIncome = null;
    const netNonGaapMatch = text.match(/net\s+income\s+on\s+a\s+non-GAAP\s+basis\s+was\s+\$\s*([\d.]+)\s+billion/i);
    const netGaapMatch = text.match(/net\s+income\s+on\s+a\s+GAAP\s+basis\s+was\s+\$\s*([\d.]+)\s+billion/i);

    if (netNonGaapMatch) {
        netIncome = parseMoney(netNonGaapMatch[1], "billion");
    } else if (netGaapMatch) {
        netIncome = parseMoney(netGaapMatch[1], "billion");
    } else {
        const netPatterns = [
            /net\s+income\s+(?:\$\s*)?(\d{1,3}(?:,\d{3})+|\d{4,})/i,
            /net\s+earnings\s+(?:\$\s*)?(\d{1,3}(?:,\d{3})+|\d{4,})/i,
        ];
        for (const pattern of netPatterns) {
            const match = text.match(pattern);
            if (match) {
                netIncome = parseMoney(match[1], "million");
                if (netIncome) break;
            }
        }
    }

    console.log(`📋 HTML extraction: revenue=${revenue}, netIncome=${netIncome}, opIncome=${opIncome}`);

    return {
        income: {
            revenue: revenue ?? null,
            net_income: netIncome ?? null,
            gross_profit: null,
            operating_income: opIncome ?? null,
        },
    };
}

// ========================================
// ✅ COMPUTE DERIVED
// ========================================

function computeDerived(bundle) {
    const inc = bundle?.reported?.income ?? {};
    const cf = bundle?.reported?.cashflow ?? {};

    const revenue = safeNum(inc.revenue);
    const grossProfit = safeNum(inc.gross_profit);
    const opIncome = safeNum(inc.operating_income);
    const netIncome = safeNum(inc.net_income);

    const ocf = safeNum(cf.operating_cash_flow);
    const capex = safeNum(cf.capex);

    const fcf = safeNum(cf.free_cash_flow) ?? computeFCF(ocf, capex);

    const grossMargin = pct(grossProfit, revenue);
    const opMargin = pct(opIncome, revenue);
    const netMargin = pct(netIncome, revenue);
    const fcfMargin = pct(fcf, revenue);
    const fcfToNI = div(fcf, netIncome);

    const metricRows = [
        { key: "gross_margin", label: "Gross Margin", category: "Profitability", unit: "%", value_reported: grossMargin, value_adjusted: null, trend_qoq: null, trend_yoy: null },
        { key: "operating_margin", label: "Operating Margin", category: "Profitability", unit: "%", value_reported: opMargin, value_adjusted: null, trend_qoq: null, trend_yoy: null },
        { key: "net_margin", label: "Net Margin", category: "Profitability", unit: "%", value_reported: netMargin, value_adjusted: null, trend_qoq: null, trend_yoy: null },

        { key: "ocf", label: "Operating Cash Flow (OCF)", category: "Quality", unit: "USD", value_reported: ocf, value_adjusted: null, trend_qoq: null, trend_yoy: null },
        { key: "capex", label: "Capex", category: "Quality", unit: "USD", value_reported: capex, value_adjusted: null, trend_qoq: null, trend_yoy: null },

        { key: "fcf", label: "Free Cash Flow (FCF)", category: "Quality", unit: "USD", value_reported: fcf, value_adjusted: null, trend_qoq: null, trend_yoy: null },
        { key: "fcf_margin", label: "FCF Margin", category: "Quality", unit: "%", value_reported: fcfMargin, value_adjusted: null, trend_qoq: null, trend_yoy: null },
        { key: "fcf_to_ni", label: "FCF / Net Income", category: "Quality", unit: "x", value_reported: fcfToNI, value_adjusted: null, trend_qoq: null, trend_yoy: null }
    ];

    const highlights = [];
    if (grossMargin != null) highlights.push(`Gross margin: ${fmtPct(grossMargin)}`);
    if (opMargin != null) highlights.push(`Operating margin: ${fmtPct(opMargin)}`);
    if (fcfMargin != null) highlights.push(`FCF margin: ${fmtPct(fcfMargin)}`);
    if (fcfToNI != null) highlights.push(`FCF / NI: ${fmtX(fcfToNI)}`);

    if (fcfToNI != null) {
        if (fcfToNI >= 1.1) highlights.push("Earnings quality: strong cash conversion");
        else if (fcfToNI >= 0.8) highlights.push("Earnings quality: ok cash conversion");
        else highlights.push("Earnings quality: weak cash conversion");
    }

    return {
        ...bundle,
        derived: {
            metricRows,
            highlights
        }
    };
}

function normalizeSymbol(sym) {
    return String(sym ?? "").trim().toUpperCase().replace(/\./g, "-");
}

// ========================================
// ✅ ROUTES
// ========================================

function registerEarningsRoutes(app) {
    console.log("✓ Rutas Earnings registradas (MOCK + SEC Discovery + XBRL)");

    // ✅ 1. Debug endpoint
    app.get("/api/earnings/_debug", async (_req, res) => {
        try {
            const data = await readMock();
            res.json({
                ok: true,
                tickers: Object.keys(data),
                time: new Date().toISOString(),
                mode: "mock"
            });
        } catch (e) {
            res.status(500).json({ ok: false, error: String(e?.message ?? e) });
        }
    });

    // ✅ 2. Source discovery endpoint
    app.get("/api/earnings/source/:symbol", async (req, res) => {
        try {
            const sym = normalizeSymbol(req.params.symbol);

            const sec = await discoverEarningsFromSEC(sym);
            const resolved = resolveEarningsSource(sec);

            res.json({
                ok: true,
                ticker: sym,
                sec,
                resolved,
            });
        } catch (e) {
            console.error("✗ ERROR en earnings/source:", e.message);
            res.status(500).json({
                ok: false,
                error: "Earnings source error",
                detail: String(e?.message ?? e),
            });
        }
    });

    // ✅ 3. Document preview endpoint
    app.get("/api/earnings/doc/:symbol", async (req, res) => {
        try {
            const sym = normalizeSymbol(req.params.symbol);

            const sec = await discoverEarningsFromSEC(sym);
            const resolved = resolveEarningsSource(sec);

            if (!sec?.ok) {
                return res.status(404).json({ ok: false, ticker: sym, error: sec?.error || "SEC discovery failed" });
            }
            if (!resolved?.selected) {
                return res.status(404).json({ ok: false, ticker: sym, error: "No selected filing to fetch", resolved });
            }

            const url = buildSecPrimaryDocUrl({
                cik: sec.cik,
                accessionNumber: resolved.selected.accessionNumber,
                primaryDocument: resolved.selected.primaryDocument,
            });

            if (!url) {
                return res.status(400).json({
                    ok: false,
                    ticker: sym,
                    error: "Could not build SEC document URL",
                    secCik: sec.cik,
                    selected: resolved.selected,
                });
            }

            const { text, contentType } = await fetchSecDocumentText(url, { timeoutMs: 15000 });

            const previewLen = Math.max(500, Math.min(8000, Number(req.query.previewLen ?? 4000)));
            const preview = text.slice(0, previewLen);

            res.json({
                ok: true,
                ticker: sym,
                selected: resolved.selected,
                url,
                contentType,
                textLength: text.length,
                preview,
            });
        } catch (e) {
            console.error("✗ ERROR en earnings/doc:", e.message);
            res.status(500).json({
                ok: false,
                error: "Earnings doc fetch error",
                detail: String(e?.message ?? e),
            });
        }
    });

    // ✅ 4. XBRL parsing endpoint (SIN Company Facts API)
    app.get("/api/earnings/xbrl/:symbol", async (req, res) => {
        try {
            const sym = normalizeSymbol(req.params.symbol);

            const sec = await discoverEarningsFromSEC(sym);
            const resolved = resolveEarningsSource(sec);

            if (!sec?.ok) {
                return res.status(404).json({ ok: false, ticker: sym, error: sec?.error || "SEC discovery failed" });
            }
            if (!resolved?.selected) {
                return res.status(404).json({ ok: false, ticker: sym, error: "No selected filing", resolved });
            }

            console.log(`🔄 Parsing document for ${sym}...`);

            // ✅ SIEMPRE buscar exhibits (8-K earnings están en Exhibit 99.1)
            const files = await listFilingFiles({
                cik: sec.cik,
                accessionNumber: resolved.selected.accessionNumber,
            });

            const best = pickBestExhibitDoc(files);
            const filename = best?.name || resolved.selected.primaryDocument;
            const pickedBy = best ? "index.json exhibit heuristic" : "primaryDocument fallback";

            console.log(`📄 Using ${pickedBy}: ${filename}`);

            const url = buildFilingFileUrl({
                cik: sec.cik,
                accessionNumber: resolved.selected.accessionNumber,
                filename,
            });

            const { text: html, contentType } = await fetchSecDocumentText(url, { timeoutMs: 20000 });

            let bundle;
            let strategy;

            if (hasInlineXbrl(html)) {
                console.log(`📊 Using Inline XBRL parsing for ${sym}`);
                bundle = extractBundleFromInlineXbrl({
                    ticker: sym,
                    filingDate: resolved.selected.filingDate,
                    html,
                });
                strategy = "inline_xbrl_parsing";
            } else if (hasHtmlTables(html)) {
                console.log(`📋 Using HTML tables parsing for ${sym}`);
                const basic = extractBasicFromHtml(html);

                bundle = {
                    ticker: sym,
                    period: {
                        period_id: null,
                        quarter_end_date: null,
                        filing_date: resolved.selected.filingDate,
                        currency: "USD",
                        scaling: "million",
                    },
                    sources: [{ doc_type: "sec_exhibit_html", url: url }],
                    reported: {
                        income: {
                            revenue: basic.income.revenue,
                            gross_profit: null,
                            operating_income: basic.income.operating_income,
                            net_income: basic.income.net_income,
                        },
                        balance: {
                            total_assets: null,
                            current_assets: null,
                            cash_and_equivalents: null,
                            short_term_investments: null,
                        },
                        cashflow: { operating_cash_flow: null, capex: null },
                        shares: { diluted: null, basic: null },
                    },
                    adjusted: {
                        income: {
                            revenue: null,
                            gross_profit: null,
                            operating_income: null,
                            net_income: null
                        }
                    },
                    adjustments: [],
                    _debug: { mode: "html_tables_fallback" },
                };
                strategy = "html_tables_regex";
            } else {
                console.log(`❌ No parsing strategy worked for ${sym}`);
                bundle = {
                    ticker: sym,
                    period: {
                        period_id: null,
                        quarter_end_date: null,
                        filing_date: resolved.selected.filingDate,
                        currency: "USD",
                        scaling: "million",
                    },
                    sources: [{ doc_type: "sec_doc_no_parse", url }],
                    reported: {
                        income: { revenue: null, gross_profit: null, operating_income: null, net_income: null },
                        balance: {
                            total_assets: null,
                            current_assets: null,
                            cash_and_equivalents: null,
                            short_term_investments: null
                        },
                        cashflow: { operating_cash_flow: null, capex: null },
                        shares: { diluted: null, basic: null },
                    },
                    adjusted: {
                        income: {
                            revenue: null,
                            gross_profit: null,
                            operating_income: null,
                            net_income: null
                        }
                    },
                    adjustments: [],
                    _debug: { mode: "no_ixbrl_no_tables" },
                };
                strategy = "no_data";
            }

            const out = computeDerived(bundle);

            res.json({
                ok: true,
                ticker: sym,
                selected: resolved.selected,
                strategy,
                pickedDoc: {
                    filename,
                    pickedBy
                },
                indexJson: files.indexUrl,
                url,
                contentType,
                bundle: out,
            });
        } catch (e) {
            console.error("✗ ERROR en earnings/xbrl:", e.message);
            res.status(500).json({
                ok: false,
                error: "Earnings XBRL error",
                detail: String(e?.message ?? e),
            });
        }
    });

    // ✅ 5. SEC Company Facts API endpoint
    app.get("/api/earnings/sec/:symbol", async (req, res) => {
        try {
            const sym = normalizeSymbol(req.params.symbol);

            const sec = await discoverEarningsFromSEC(sym);

            if (!sec?.ok || !sec?.cik) {
                return res.status(404).json({
                    ok: false,
                    ticker: sym,
                    error: "CIK not found for ticker"
                });
            }

            const cik10 = String(sec.cik).padStart(10, "0");
            const cf = await fetchCompanyFacts(cik10);

            cf.cik = cik10;

            const { series } = await extractSeriesFromCompanyFacts(sym, cf, 1);
            const bundle = series?.[0] ?? null;

            const out = computeDerived(bundle);

            res.json({ ok: true, ticker: sym, cik: cik10, bundle: out });
        } catch (e) {
            console.error("✗ ERROR en earnings/sec:", e.message);
            res.status(500).json({ ok: false, error: String(e?.message ?? e) });
        }
    });


    // // ✅ 7. Fundamentals series endpoint
    // app.get("/api/fundamentals/:ticker/series", async (req, res) => {
    //     try {
    //         const sym = normalizeSymbol(req.params.ticker);
    //         const limit = Math.min(Number(req.query.limit) || 16, 40); // max 40 períodos

    //         // ✅ Resolver CIK desde ticker
    //         const cik = await resolveCikFromTicker(sym);
    //         const cik10 = String(cik).padStart(10, "0");

    //         // ✅ Fetch CompanyFacts
    //         const cf = await fetchCompanyFacts(cik10);

    //         // ✅ Extraer serie
    //         const series = extractSeriesFromCompanyFacts(sym, cf, limit);

    //         if (!series || series.length === 0) {
    //             return res.status(404).json({
    //                 ok: false,
    //                 ticker: sym,
    //                 error: "No quarterly data found",
    //                 series: []
    //             });
    //         }

    //         res.json({
    //             ok: true,
    //             ticker: sym,
    //             cik: cik10,
    //             currency: "USD",
    //             scaling: "raw",
    //             series,
    //             _debug: {
    //                 periods_found: series.length
    //             }
    //         });
    //     } catch (e) {
    //         console.error("✗ ERROR en fundamentals/series:", e.message);
    //         res.status(500).json({
    //             ok: false,
    //             error: "Fundamentals series error",
    //             detail: String(e?.message ?? e)
    //         });
    //     }
    // });



    // ✅ 6. Mock data endpoint (catch-all al final)
    app.get("/api/earnings/:symbol", async (req, res) => {
        try {
            const sym = normalizeSymbol(req.params.symbol);
            const data = await readMock();
            const bundle = data[sym];

            if (!bundle) {
                return res.status(404).json({
                    error: "No mock data for ticker",
                    ticker: sym,
                    available: Object.keys(data)
                });
            }

            const out = computeDerived(bundle);
            res.json(out);
        } catch (e) {
            console.error("✗ ERROR en earnings:", e.message);
            res.status(500).json({ error: "Earnings error", detail: String(e?.message ?? e) });
        }
    });
}

module.exports = { registerEarningsRoutes };
