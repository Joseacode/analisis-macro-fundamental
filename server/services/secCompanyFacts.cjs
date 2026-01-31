// server/services/secCompanyFacts.cjs
const path = require("path");
const fs = require("fs/promises");

// =======================
// file cache helpers
// =======================
async function readCacheJson(file, ttlMs) {
    try {
        const st = await fs.stat(file);
        if (Date.now() - st.mtimeMs > ttlMs) return null;
        const txt = await fs.readFile(file, "utf-8");
        return JSON.parse(txt);
    } catch {
        return null;
    }
}

async function writeCacheJson(file, data) {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(data, null, 2), "utf-8");
}

function padCik10(cik) {
    const s = String(cik ?? "").replace(/\D/g, "");
    return s.padStart(10, "0");
}

function normalizeSymbol(sym) {
    return String(sym ?? "").trim().toUpperCase().replace(/\./g, "-");
}

// =======================
// SEC: ticker -> CIK map
// =======================
const SEC_CACHE_DIR = path.resolve(__dirname, "..", ".cache", "sec");
const TICKER_MAP_FILE = path.join(SEC_CACHE_DIR, "company_tickers.json");
const TICKER_MAP_TTL = 7 * 24 * 60 * 60 * 1000; // 7d

async function getTickerToCikMap() {
    const cached = await readCacheJson(TICKER_MAP_FILE, TICKER_MAP_TTL);
    if (cached?.map) return cached.map;

    const url = "https://www.sec.gov/files/company_tickers.json";
    const res = await fetch(url, {
        headers: {
            "User-Agent": "institutional-macro-dashboard/1.0 (contact: jose)",
            Accept: "application/json",
        },
    });

    if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`SEC ticker map failed: ${res.status} ${txt.slice(0, 160)}`);
    }

    const json = await res.json();

    // json: { "0": {cik_str, ticker, title}, ... }
    const map = {};
    for (const k of Object.keys(json)) {
        const row = json[k];
        if (!row?.ticker || !row?.cik_str) continue;
        map[String(row.ticker).toUpperCase()] = padCik10(row.cik_str);
    }

    await writeCacheJson(TICKER_MAP_FILE, { asOf: new Date().toISOString(), map });
    return map;
}

async function resolveCikFromTicker(ticker) {
    const t = normalizeSymbol(ticker);
    const map = await getTickerToCikMap();
    const cik = map[t];
    if (!cik) throw new Error(`No CIK for ticker: ${t}`);
    return cik;
}

// =======================
// SEC XBRL: companyfacts
// =======================
async function fetchCompanyFacts(cik10) {
    const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik10}.json`;
    const res = await fetch(url, {
        headers: {
            "User-Agent": "institutional-macro-dashboard/1.0 (contact: jose)",
            Accept: "application/json",
        },
    });

    if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`companyfacts failed: ${res.status} ${txt.slice(0, 160)}`);
    }
    return res.json();
}

// =======================
// ✅ HELPERS PARA PERIOD MATCHING
// =======================

function isGoodFp(fp) {
    const s = String(fp || "").toUpperCase();
    return ["Q1", "Q2", "Q3", "Q4", "FY"].includes(s);
}

function pickLatest(items) {
    // items: [{ value, end, filed, form, fp, fy, unit }]
    // Orden: filed desc, end desc
    return [...items]
        .filter((x) => x && x.value != null && x.end && x.filed)
        .sort((a, b) => {
            if (a.filed !== b.filed) return a.filed < b.filed ? 1 : -1;
            if (a.end !== b.end) return a.end < b.end ? 1 : -1;
            return 0;
        })[0] || null;
}

function pickForPeriod(items, anchor) {
    if (!anchor) return pickLatest(items);

    const end = anchor.end;
    const fy = anchor.fy;
    const fp = anchor.fp;

    // 1) match exact end + fy + fp
    const exact = items.find(
        (x) => x.end === end && x.fy === fy && String(x.fp).toUpperCase() === String(fp).toUpperCase()
    );
    if (exact) return exact;

    // 2) match exact end
    const sameEnd = items.find((x) => x.end === end);
    if (sameEnd) return sameEnd;

    // 3) fallback latest
    return pickLatest(items);
}

function buildPeriodId(picked) {
    const fy = picked?.fy;
    const fp = picked?.fp;
    const end = picked?.end;

    if (typeof fy === "number" && fp) {
        const cleanFp = String(fp).toUpperCase().replace(/[^A-Z0-9]/g, "");
        return `FY${fy}${cleanFp}`;
    }
    if (end) return `END_${end}`;
    return null;
}

// =======================
// ✅ EXTRACT FACTS FROM UNITS
// =======================

function extractFactItems(factObj, unitWanted) {
    if (!factObj?.units) return [];

    const units = factObj.units;
    const unitKeys = Object.keys(units);
    if (!unitKeys.length) return [];

    let pickUnitKey = null;

    if (unitWanted === "USD") {
        pickUnitKey =
            unitKeys.find((k) => k === "USD") ||
            unitKeys.find((k) => k.startsWith("USD")) ||
            unitKeys[0];
    } else {
        pickUnitKey =
            unitKeys.find((k) => k === "shares") ||
            unitKeys.find((k) => k.toLowerCase().includes("shares")) ||
            unitKeys[0];
    }

    const arr = Array.isArray(units[pickUnitKey]) ? units[pickUnitKey] : [];
    if (!arr.length) return [];

    const okForms = new Set(["10-Q", "10-K", "20-F", "40-F", "6-K", "8-K"]);

    const base = arr
        .filter((x) => x && typeof x.val === "number" && x.end)
        .filter((x) => okForms.has(String(x.form || "")));

    const list = base.length ? base : arr.filter((x) => x && typeof x.val === "number" && x.end);

    return list.map((item) => ({
        value: item.val,
        end: item.end ?? null,
        filed: item.filed ?? null,
        form: item.form ?? null,
        fp: item.fp ?? null,
        fy: item.fy ?? null,
        unit: pickUnitKey,
    }));
}

// =======================
// ✅ EXTRACT BUNDLE (FIXED)
// =======================

function extractBundleFromCompanyFacts(ticker, companyFactsJson) {
    const facts = companyFactsJson?.facts?.["us-gaap"] ?? {};

    // ✅ PASO 1: Buscar Revenue en múltiples tags (fallback robusto)
    const revenueItems =
        extractFactItems(facts.Revenues, "USD").length > 0 ? extractFactItems(facts.Revenues, "USD") :
            extractFactItems(facts.RevenueFromContractWithCustomerExcludingAssessedTax, "USD").length > 0 ? extractFactItems(facts.RevenueFromContractWithCustomerExcludingAssessedTax, "USD") :
                extractFactItems(facts.SalesRevenueNet, "USD").length > 0 ? extractFactItems(facts.SalesRevenueNet, "USD") :
                    extractFactItems(facts.RevenueFromContractWithCustomerIncludingAssessedTax, "USD").length > 0 ? extractFactItems(facts.RevenueFromContractWithCustomerIncludingAssessedTax, "USD") :
                        [];

    // Si no hay revenue, intentar con net income como anchor
    let anchorItems = revenueItems.length > 0 ? revenueItems : extractFactItems(facts.NetIncomeLoss, "USD");

    const anchor = pickLatest(anchorItems);

    if (!anchor) {
        // No hay revenue ni net income, bundle vacío
        return {
            ticker: normalizeSymbol(ticker),
            period: { period_id: null, quarter_end_date: null, filing_date: null, currency: "USD", scaling: "raw" },
            sources: [{ doc_type: "sec_companyfacts", url: `https://data.sec.gov/api/xbrl/companyfacts/CIK${padCik10(companyFactsJson?.cik)}.json` }],
            reported: { income: {}, balance: {}, cashflow: {}, shares: {} },
            adjusted: { income: {} },
            adjustments: [],
            _debug: { error: "No revenue or net income data found" },
        };
    }

    // ✅ PASO 2: Extraer items de cada concepto
    const grossProfitItems = extractFactItems(facts.GrossProfit, "USD");
    const costOfRevenueItems = extractFactItems(facts.CostOfRevenue, "USD");
    const opIncomeItems = extractFactItems(facts.OperatingIncomeLoss, "USD");
    const netIncomeItems = extractFactItems(facts.NetIncomeLoss, "USD");

    const ocfItems = extractFactItems(facts.NetCashProvidedByUsedInOperatingActivities, "USD");
    const capexItems = extractFactItems(facts.PaymentsToAcquirePropertyPlantAndEquipment, "USD");

    const assetsItems = extractFactItems(facts.Assets, "USD");
    const assetsCurrentItems = extractFactItems(facts.AssetsCurrent, "USD");
    const cashItems = extractFactItems(facts.CashAndCashEquivalentsAtCarryingValue, "USD");
    const stInvItems = extractFactItems(facts.AvailableForSaleSecuritiesCurrent, "USD");

    const dilutedSharesItems = extractFactItems(facts.WeightedAverageNumberOfDilutedSharesOutstanding, "shares");
    const basicSharesItems = extractFactItems(facts.WeightedAverageNumberOfSharesOutstandingBasic, "shares");

    // ✅ PASO 3: Pick todos los otros facts para el MISMO período
    const revenues = anchor;
    let grossProfit = pickForPeriod(grossProfitItems, anchor);

    // Fallback: calcular gross profit si falta
    if (!grossProfit || grossProfit.value == null) {
        const cost = pickForPeriod(costOfRevenueItems, anchor);
        if (revenues?.value != null && cost?.value != null) {
            grossProfit = {
                value: revenues.value - cost.value,
                end: revenues.end,
                filed: revenues.filed,
                form: revenues.form,
                fp: revenues.fp,
                fy: revenues.fy,
                unit: "USD",
            };
        }
    }

    const opIncome = pickForPeriod(opIncomeItems, anchor);
    const netIncome = pickForPeriod(netIncomeItems, anchor);

    const ocf = pickForPeriod(ocfItems, anchor);
    const capexAbs = pickForPeriod(capexItems, anchor);
    // Normalización: capex negativo
    const capex = capexAbs?.value != null ? { ...capexAbs, value: -Math.abs(capexAbs.value) } : capexAbs;

    const assets = pickForPeriod(assetsItems, anchor);
    const assetsCurrent = pickForPeriod(assetsCurrentItems, anchor);
    const cash = pickForPeriod(cashItems, anchor);
    const stInv = pickForPeriod(stInvItems, anchor);

    const dilutedShares = pickForPeriod(dilutedSharesItems, anchor);
    const basicShares = pickForPeriod(basicSharesItems, anchor);

    // ✅ PASO 4: Build bundle
    return {
        ticker: normalizeSymbol(ticker),
        period: {
            period_id: buildPeriodId(anchor),
            quarter_end_date: anchor.end,
            filing_date: anchor.filed,
            currency: "USD",
            scaling: "raw",
        },
        sources: [
            {
                doc_type: "sec_companyfacts",
                url: `https://data.sec.gov/api/xbrl/companyfacts/CIK${padCik10(companyFactsJson?.cik)}.json`,
            },
        ],
        reported: {
            income: {
                revenue: revenues?.value ?? null,
                gross_profit: grossProfit?.value ?? null,
                operating_income: opIncome?.value ?? null,
                net_income: netIncome?.value ?? null,
            },
            balance: {
                total_assets: assets?.value ?? null,
                current_assets: assetsCurrent?.value ?? null,
                cash_and_equivalents: cash?.value ?? null,
                short_term_investments: stInv?.value ?? null,
            },
            cashflow: {
                operating_cash_flow: ocf?.value ?? null,
                capex: capex?.value ?? null,
            },
            shares: {
                diluted: dilutedShares?.value ?? null,
                basic: basicShares?.value ?? null,
            },
        },
        adjusted: {
            income: {
                revenue: revenues?.value ?? null,
                gross_profit: grossProfit?.value ?? null,
                operating_income: opIncome?.value ?? null,
                net_income: netIncome?.value ?? null,
            },
        },
        adjustments: [],
        _debug: {
            targetPeriod: { end: anchor.end, fy: anchor.fy, fp: anchor.fp, form: anchor.form },
            picked: { revenues, grossProfit, netIncome, ocf, capex, dilutedShares },
        },
    };
}

module.exports = {
    normalizeSymbol,
    resolveCikFromTicker,
    fetchCompanyFacts,
    extractBundleFromCompanyFacts,
};
