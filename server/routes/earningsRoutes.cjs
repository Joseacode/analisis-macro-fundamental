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
    extractBundleFromCompanyFacts
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

// core metrics (MVP) en JS para no meternos aún con TS en el server.
// Después lo portamos/compartimos si querés.
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

// ✅ Helper: FCF robusto (extraído como función independiente)
function computeFCF(ocf, capex) {
    if (ocf == null || capex == null) return null;
    // Si capex viene negativo (común), FCF = OCF + capex
    // Si capex es positivo (raro), FCF = OCF - capex
    return capex < 0 ? ocf + capex : ocf - capex;
}

// ========================================
// ✅ NUEVOS HELPERS: Detección y parsing HTML
// ========================================

function hasInlineXbrl(html) {
    if (!html) return false;
    // ix:nonFraction / ix:nonNumeric es lo más típico
    return /<ix:(nonfraction|nonnumeric)\b/i.test(html);
}

// ultra simple: detecta si hay tablas
function hasHtmlTables(html) {
    if (!html) return false;
    return /<table\b/i.test(html);
}

// VERY MVP: intenta sacar números de un "Condensed Consolidated Statements of Operations"
// usando keywords (esto lo refinamos luego)
function extractBasicFromHtml(html) {
    const text = String(html)
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    // helpers para parsear valores tipo 62,000 o (1,234)
    const parseMoney = (s) => {
        if (!s) return null;
        const m = String(s).match(/-?\(?\d{1,3}(?:,\d{3})*(?:\.\d+)?\)?/);
        if (!m) return null;
        let v = m[0];
        const neg = v.includes("(") && v.includes(")");
        v = v.replace(/[(),]/g, "");
        const n = Number(v);
        if (!Number.isFinite(n)) return null;
        return neg ? -n : n;
    };

    // keywords típicos (muy MVP)
    const revenue =
        parseMoney((text.match(/total revenue[s]?\s+([\(\)\d,\.]+)/i) || [])[1]) ??
        parseMoney((text.match(/revenue[s]?\s+([\(\)\d,\.]+)/i) || [])[1]);

    const netIncome =
        parseMoney((text.match(/net income\s+([\(\)\d,\.]+)/i) || [])[1]) ??
        parseMoney((text.match(/net earnings\s+([\(\)\d,\.]+)/i) || [])[1]);

    // devolvemos un bundle parcial (vamos completando)
    return {
        income: {
            revenue: revenue ?? null,
            net_income: netIncome ?? null,
            gross_profit: null,
            operating_income: null,
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

    // ✅ Usar helper computeFCF para consistencia
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

        // ✅ ahora FCF sale coherente usando computeFCF
        { key: "fcf", label: "Free Cash Flow (FCF)", category: "Quality", unit: "USD", value_reported: fcf, value_adjusted: null, trend_qoq: null, trend_yoy: null },
        { key: "fcf_margin", label: "FCF Margin", category: "Quality", unit: "%", value_reported: fcfMargin, value_adjusted: null, trend_qoq: null, trend_yoy: null },
        { key: "fcf_to_ni", label: "FCF / Net Income", category: "Quality", unit: "x", value_reported: fcfToNI, value_adjusted: null, trend_qoq: null, trend_yoy: null }
    ];

    // ✅ Highlights MVP (sin humo)
    const highlights = [];
    if (grossMargin != null) highlights.push(`Gross margin: ${fmtPct(grossMargin)}`);
    if (opMargin != null) highlights.push(`Operating margin: ${fmtPct(opMargin)}`);
    if (fcfMargin != null) highlights.push(`FCF margin: ${fmtPct(fcfMargin)}`);
    if (fcfToNI != null) highlights.push(`FCF / NI: ${fmtX(fcfToNI)}`);

    // señal rápida de calidad (simple)
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

    // ✅ 1. Debug endpoint (más específico primero)
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

    // ✅ 2. Source discovery endpoint (SEC EDGAR)
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

            // Preview para que no explote la respuesta
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

    // ✅ 4. XBRL parsing endpoint (Company Facts API + fallbacks)
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

            // ✅ ESTRATEGIA 1: Company Facts API (MEJOR - datos pre-procesados por SEC)
            try {
                console.log(`🔍 Attempting Company Facts API for ${sym}...`);
                const cik10 = String(sec.cik).padStart(10, "0");
                const companyFacts = await fetchCompanyFacts(cik10);
                const bundle = extractBundleFromCompanyFacts(sym, companyFacts);

                // Validar que sacamos al menos revenue o net_income
                if (bundle.reported.income.revenue || bundle.reported.income.net_income) {
                    console.log(`✅ Company Facts API success for ${sym}`);
                    const out = computeDerived(bundle);
                    return res.json({
                        ok: true,
                        ticker: sym,
                        selected: resolved.selected,
                        strategy: "company_facts_api",
                        bundle: out,
                    });
                } else {
                    console.log(`⚠️ Company Facts API returned empty data for ${sym}`);
                }
            } catch (apiErr) {
                console.warn(`⚠️ Company Facts API failed for ${sym}:`, apiErr.message);
            }

            // ✅ ESTRATEGIA 2-4: Fallback a parsing de documentos HTML/XBRL
            console.log(`🔄 Falling back to document parsing for ${sym}...`);

            const files = await listFilingFiles({
                cik: sec.cik,
                accessionNumber: resolved.selected.accessionNumber,
            });

            const best = pickBestExhibitDoc(files);
            const filename = best?.name || resolved.selected.primaryDocument;

            const url = buildFilingFileUrl({
                cik: sec.cik,
                accessionNumber: resolved.selected.accessionNumber,
                filename,
            });

            const { text: html, contentType } = await fetchSecDocumentText(url, { timeoutMs: 20000 });

            let bundle;
            let strategy;

            if (hasInlineXbrl(html)) {
                // ESTRATEGIA 2: Inline XBRL parsing
                console.log(`📊 Using Inline XBRL parsing for ${sym}`);
                bundle = extractBundleFromInlineXbrl({
                    ticker: sym,
                    filingDate: resolved.selected.filingDate,
                    html,
                });
                strategy = "inline_xbrl_parsing";
            } else if (hasHtmlTables(html)) {
                // ESTRATEGIA 3: HTML tables regex parsing
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
                            operating_income: null,
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
                // ESTRATEGIA 4: Bundle vacío
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
                    pickedBy: best ? "index.json exhibit heuristic" : "primaryDocument fallback"
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


    // ✅ 5. SEC Company Facts API endpoint (datos reales XBRL del SEC)
    app.get("/api/earnings/sec/:symbol", async (req, res) => {
        try {
            const sym = normalizeSymbol(req.params.symbol);

            // ✅ Primero intentar con discoverEarningsFromSEC para obtener CIK
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

            // cf.cik in response is numeric; keep it for source URL
            cf.cik = cik10;

            const bundle = extractBundleFromCompanyFacts(sym, cf);
            const out = computeDerived(bundle);

            res.json({ ok: true, ticker: sym, cik: cik10, bundle: out });
        } catch (e) {
            console.error("✗ ERROR en earnings/sec:", e.message);
            res.status(500).json({ ok: false, error: String(e?.message ?? e) });
        }
    });


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

            // MVP: computed derived metrics
            const out = computeDerived(bundle);
            res.json(out);
        } catch (e) {
            console.error("✗ ERROR en earnings:", e.message);
            res.status(500).json({ error: "Earnings error", detail: String(e?.message ?? e) });
        }
    });
}

module.exports = { registerEarningsRoutes };
