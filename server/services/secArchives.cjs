// server/services/secArchives.cjs

const SEC_ARCHIVES_BASE = "https://www.sec.gov/Archives/edgar/data";

const SEC_HEADERS = {
    "User-Agent": process.env.SEC_USER_AGENT || "institutional-macro-dashboard/1.0 (set SEC_USER_AGENT)",
    "Accept-Encoding": "gzip, deflate",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

function cikToIntString(cikPadded10) {
    // EDGAR usa CIK como int sin ceros a la izquierda en el path
    const n = Number(String(cikPadded10).replace(/^0+/, "")) || 0;
    return String(n);
}

function accessionNoDashes(accessionNumber) {
    return String(accessionNumber || "").replace(/-/g, "");
}

function buildSecPrimaryDocUrl({ cik, accessionNumber, primaryDocument }) {
    if (!cik || !accessionNumber || !primaryDocument) return null;

    const cikInt = cikToIntString(cik);
    const acc = accessionNoDashes(accessionNumber);

    return `${SEC_ARCHIVES_BASE}/${cikInt}/${acc}/${primaryDocument}`;
}

async function fetchSecDocumentText(url, opts) {
    const timeoutMs = Math.max(1000, Math.min(30000, Number(opts?.timeoutMs ?? 12000)));
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(url, {
            headers: SEC_HEADERS,
            signal: controller.signal,
        });

        if (!res.ok) {
            const txt = await res.text().catch(() => "");
            throw new Error(`SEC doc fetch failed: ${res.status} ${txt.slice(0, 120)}`);
        }

        const contentType = res.headers.get("content-type") || "";
        const text = await res.text();

        return { text, contentType };
    } finally {
        clearTimeout(t);
    }
}

module.exports = {
    buildSecPrimaryDocUrl,
    fetchSecDocumentText,
};
