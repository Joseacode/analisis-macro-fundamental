// server/services/secEdgar.cjs
const SEC_BASE = "https://data.sec.gov";

const SEC_HEADERS = {
    "User-Agent": process.env.SEC_USER_AGENT || "institutional-macro-dashboard/1.0 (contact: set SEC_USER_AGENT)",
    "Accept-Encoding": "gzip, deflate",
    "Accept": "application/json",
};

let tickersCache = null;
let tickersCacheAt = 0;
const TICKERS_TTL = 24 * 60 * 60 * 1000; // 24h

async function fetchCompanyTickers() {
    const now = Date.now();
    if (tickersCache && (now - tickersCacheAt) < TICKERS_TTL) return tickersCache;

    const url = "https://www.sec.gov/files/company_tickers.json";
    const res = await fetch(url, { headers: SEC_HEADERS });

    if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`SEC company_tickers fetch failed: ${res.status} ${txt.slice(0, 120)}`);
    }

    const json = await res.json();
    tickersCache = json;
    tickersCacheAt = now;
    return json;
}

async function fetchCIK(ticker) {
    const t = String(ticker || "").trim().toUpperCase();
    if (!t) return null;

    const json = await fetchCompanyTickers();
    const entry = Object.values(json).find((c) => String(c.ticker).toUpperCase() === t);

    if (!entry?.cik_str) return null;
    return String(entry.cik_str).padStart(10, "0");
}

async function fetchRecentFilingsByCIK(cik) {
    const url = `${SEC_BASE}/submissions/CIK${cik}.json`;
    const res = await fetch(url, { headers: SEC_HEADERS });

    if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`SEC submissions fetch failed: ${res.status} ${txt.slice(0, 120)}`);
    }

    return res.json();
}

function pickRelevantFilings(submissions) {
    const recent = submissions?.filings?.recent;
    if (!recent?.form?.length) return [];

    const out = [];
    for (let i = 0; i < recent.form.length; i++) {
        const form = recent.form[i];
        if (form !== "10-Q" && form !== "10-K" && form !== "8-K") continue;

        out.push({
            form,
            filingDate: recent.filingDate?.[i] ?? null,
            reportDate: recent.reportDate?.[i] ?? null,
            accessionNumber: recent.accessionNumber?.[i] ?? null,
            primaryDocument: recent.primaryDocument?.[i] ?? null,
        });
    }

    out.sort((a, b) => new Date(b.filingDate || 0) - new Date(a.filingDate || 0));
    return out;
}

async function discoverEarningsFromSEC(ticker) {
    const t = String(ticker || "").trim().toUpperCase();

    const cik = await fetchCIK(t);
    if (!cik) {
        return { ok: false, ticker: t, error: "CIK not found" };
    }

    const submissions = await fetchRecentFilingsByCIK(cik);
    const filings = pickRelevantFilings(submissions);

    return {
        ok: true,
        ticker: t,
        cik,
        discoveredAt: new Date().toISOString(),
        filings,
        mostRecent: filings[0] ?? null,
    };
}

module.exports = {
    discoverEarningsFromSEC,
};
