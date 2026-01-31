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

function pickLatestFact(factObj, unitWanted /* "USD" | "shares" */) {
    if (!factObj?.units) {
        return { value: null, end: null, filed: null, form: null, fp: null, fy: null, unit: null };
    }

    const units = factObj.units;
    const unitKeys = Object.keys(units);
    if (!unitKeys.length) {
        return { value: null, end: null, filed: null, form: null, fp: null, fy: null, unit: null };
    }

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
    if (!arr.length) {
        return { value: null, end: null, filed: null, form: null, fp: null, fy: null, unit: pickUnitKey };
    }

    const okForms = new Set(["10-Q", "10-K", "20-F", "40-F", "6-K", "8-K"]);

    const base = arr
        .filter((x) => x && typeof x.val === "number" && x.end)
        .filter((x) => okForms.has(String(x.form || "")));

    const list = base.length ? base : arr.filter((x) => x && typeof x.val === "number" && x.end);
    if (!list.length) {
        return { value: null, end: null, filed: null, form: null, fp: null, fy: null, unit: pickUnitKey };
    }

    list.sort((a, b) => {
        const ae = String(a.end);
        const be = String(b.end);
        if (ae !== be) return be.localeCompare(ae);
        const af = String(a.filed || "");
        const bf = String(b.filed || "");
        return bf.localeCompare(af);
    });

    const top = list[0];
    return {
        value: top.val,
        end: top.end ?? null,
        filed: top.filed ?? null,
        form: top.form ?? null,
        fp: top.fp ?? null,
        fy: top.fy ?? null,
        unit: pickUnitKey,
    };
}

function extractBundleFromCompanyFacts(ticker, companyFactsJson) {
    const facts = companyFactsJson?.facts?.["us-gaap"] ?? {};

    // Core tags (MVP)
    const revenues = pickLatestFact(facts.Revenues, "USD");
    const grossProfit = pickLatestFact(facts.GrossProfit, "USD");
    const opIncome = pickLatestFact(facts.OperatingIncomeLoss, "USD");
    const netIncome = pickLatestFact(facts.NetIncomeLoss, "USD");

    const ocf = pickLatestFact(facts.NetCashProvidedByUsedInOperatingActivities, "USD");
    const capex = pickLatestFact(facts.PaymentsToAcquirePropertyPlantAndEquipment, "USD");

    const assets = pickLatestFact(facts.Assets, "USD");
    const assetsCurrent = pickLatestFact(facts.AssetsCurrent, "USD");
    const cash = pickLatestFact(facts.CashAndCashEquivalentsAtCarryingValue, "USD");
    const stInv = pickLatestFact(facts.AvailableForSaleSecuritiesCurrent, "USD"); // proxy ok

    const dilutedShares = pickLatestFact(facts.WeightedAverageNumberOfDilutedSharesOutstanding, "shares");
    const basicShares = pickLatestFact(facts.WeightedAverageNumberOfSharesOutstandingBasic, "shares");

    const periodEnd = revenues.end || netIncome.end || assets.end || null;
    const filed = revenues.filed || netIncome.filed || assets.filed || null;

    return {
        ticker: normalizeSymbol(ticker),
        period: {
            period_id: periodEnd ? `END_${periodEnd}` : null,
            quarter_end_date: periodEnd,
            filing_date: filed,
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
                revenue: revenues.value ?? null,
                gross_profit: grossProfit.value ?? null,
                operating_income: opIncome.value ?? null,
                net_income: netIncome.value ?? null,
            },
            balance: {
                total_assets: assets.value ?? null,
                current_assets: assetsCurrent.value ?? null,
                cash_and_equivalents: cash.value ?? null,
                short_term_investments: stInv.value ?? null,
            },
            cashflow: {
                operating_cash_flow: ocf.value ?? null,
                capex: capex.value ?? null,
            },
            shares: {
                diluted: dilutedShares.value ?? null,
                basic: basicShares.value ?? null,
            },
        },
        adjusted: {
            income: {
                revenue: revenues.value ?? null,
                gross_profit: grossProfit.value ?? null,
                operating_income: opIncome.value ?? null,
                net_income: netIncome.value ?? null,
            },
        },
        adjustments: [],
        _debug: {
            picked: { revenues, netIncome, ocf, capex, dilutedShares },
        },
    };
}

module.exports = {
    normalizeSymbol,
    resolveCikFromTicker,
    fetchCompanyFacts,
    extractBundleFromCompanyFacts,
};
