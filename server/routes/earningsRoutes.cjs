// server/routes/earningsRoutes.cjs

const path = require("path");
const fs = require("fs/promises");

// ✅ NUEVO: imports para SEC discovery
const { discoverEarningsFromSEC } = require("../services/secEdgar.cjs");
const { resolveEarningsSource } = require("../services/earningsSourceResolver.cjs");

// Lee JSON mock una vez por request (simple). Luego optimizamos con cache en memoria.
const MOCK_FILE = path.resolve(__dirname, "..", "data", "earningsMock.json");

// ✅ A4: fetch documento primario desde SEC (sin parsear)
const { buildSecPrimaryDocUrl, fetchSecDocumentText } = require("../services/secArchives.cjs");

async function readMock() {
    const txt = await fs.readFile(MOCK_FILE, "utf-8");
    return JSON.parse(txt);
}

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

function computeDerived(bundle) {
    const inc = bundle?.reported?.income ?? {};
    const cf = bundle?.reported?.cashflow ?? {};

    const revenue = safeNum(inc.revenue);
    const grossProfit = safeNum(inc.gross_profit);
    const opIncome = safeNum(inc.operating_income);
    const netIncome = safeNum(inc.net_income);

    const ocf = safeNum(cf.operating_cash_flow);
    const capex = safeNum(cf.capex);

    // ✅ REGLA: si capex ya viene NEGATIVO (salida de caja), FCF = OCF + Capex
    // Si algún día lo cargás positivo (raro), también queda correcto porque suma lo resta.
    const fcf =
        safeNum(cf.free_cash_flow) ??
        (ocf != null && capex != null ? ocf + capex : null);

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

        // ✅ ahora FCF sale coherente (185 + (-32) = 153)
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

function registerEarningsRoutes(app) {
    console.log("✓ Rutas Earnings registradas (MOCK + SEC Discovery)");

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

    // ✅ 2. NUEVO: Source discovery endpoint (SEC EDGAR)
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

    // ✅ 3. Mock data endpoint (catch-all al final)
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
}



module.exports = { registerEarningsRoutes };
