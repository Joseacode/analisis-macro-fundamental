const path = require("path");
const fs = require("fs/promises");

// Lee JSON mock una vez por request (simple). Luego optimizamos con cache en memoria.
const MOCK_FILE = path.resolve(__dirname, "..", "data", "earningsMock.json");

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

function computeDerived(bundle) {
    const inc = bundle?.reported?.income ?? {};
    const cf = bundle?.reported?.cashflow ?? {};

    const revenue = safeNum(inc.revenue);
    const grossProfit = safeNum(inc.gross_profit);
    const opIncome = safeNum(inc.operating_income);
    const netIncome = safeNum(inc.net_income);

    const ocf = safeNum(cf.operating_cash_flow);
    const capex = safeNum(cf.capex);
    const fcf = safeNum(cf.free_cash_flow) ?? (ocf != null && capex != null ? ocf - capex : null);

    const metricRows = [
        { key: "gross_margin", label: "Gross Margin", category: "Profitability", unit: "%", value_reported: pct(grossProfit, revenue), value_adjusted: null, trend_qoq: null, trend_yoy: null },
        { key: "operating_margin", label: "Operating Margin", category: "Profitability", unit: "%", value_reported: pct(opIncome, revenue), value_adjusted: null, trend_qoq: null, trend_yoy: null },
        { key: "net_margin", label: "Net Margin", category: "Profitability", unit: "%", value_reported: pct(netIncome, revenue), value_adjusted: null, trend_qoq: null, trend_yoy: null },

        { key: "ocf", label: "Operating Cash Flow (OCF)", category: "Quality", unit: "USD", value_reported: ocf, value_adjusted: null, trend_qoq: null, trend_yoy: null },
        { key: "capex", label: "Capex", category: "Quality", unit: "USD", value_reported: capex, value_adjusted: null, trend_qoq: null, trend_yoy: null },
        { key: "fcf", label: "Free Cash Flow (FCF)", category: "Quality", unit: "USD", value_reported: fcf, value_adjusted: null, trend_qoq: null, trend_yoy: null },
        { key: "fcf_margin", label: "FCF Margin", category: "Quality", unit: "%", value_reported: pct(fcf, revenue), value_adjusted: null, trend_qoq: null, trend_yoy: null },
        { key: "fcf_to_ni", label: "FCF / Net Income", category: "Quality", unit: "x", value_reported: div(fcf, netIncome), value_adjusted: null, trend_qoq: null, trend_yoy: null }
    ];

    return {
        ...bundle,
        derived: {
            metricRows,
            highlights: []
        }
    };
}

function normalizeSymbol(sym) {
    return String(sym ?? "").trim().toUpperCase().replace(/\./g, "-");
}

function registerEarningsRoutes(app) {
    console.log("✓ Rutas Earnings registradas (MOCK)");

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
