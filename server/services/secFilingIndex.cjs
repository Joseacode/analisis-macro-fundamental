// server/services/secFilingIndex.cjs

function accessionNoNoDashes(accessionNumber) {
    return String(accessionNumber ?? "").replace(/-/g, "");
}

function buildFilingIndexJsonUrl({ cik, accessionNumber }) {
    const cikNum = String(cik).replace(/^0+/, ""); // SEC usa sin leading zeros en URL
    const acc = accessionNoNoDashes(accessionNumber);
    return `https://www.sec.gov/Archives/edgar/data/${cikNum}/${acc}/index.json`;
}

async function fetchSecJson(url, { timeoutMs = 20000 } = {}) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);

    const res = await fetch(url, {
        signal: ctrl.signal,
        headers: {
            // MUY importante para SEC: UA + Accept
            "User-Agent": "institutional-macro-dashboard/1.0 (contact: dev)",
            "Accept": "application/json,text/plain,*/*",
        },
    }).finally(() => clearTimeout(t));

    if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`SEC index.json failed ${res.status}: ${txt.slice(0, 160)}`);
    }

    return res.json();
}

async function listFilingFiles({ cik, accessionNumber }, opts) {
    const url = buildFilingIndexJsonUrl({ cik, accessionNumber });
    const json = await fetchSecJson(url, opts);

    const items = json?.directory?.item ?? [];
    return {
        indexUrl: url,
        baseUrl: json?.directory?.name
            ? url.replace(/\/index\.json$/i, "/")
            : url.replace(/\/index\.json$/i, "/"),
        items: items.map((x) => ({
            name: x.name,
            type: x.type,
            size: x.size,
            lastModified: x.last_modified,
        })),
    };
}

function pickBestExhibitDoc(files) {
    const items = files?.items ?? [];

    // Filtrar documentos navegables
    const docs = items.filter((x) => {
        const n = String(x.name || "").toLowerCase();
        return (
            n.endsWith(".htm") ||
            n.endsWith(".html") ||
            n.endsWith(".txt") ||
            n.endsWith(".pdf")
        );
    });

    // Heurística: Exhibit 99.1 suele verse como ex99.1, ex991, exhibit99, 99-1, etc.
    const scoreDoc = (name) => {
        const n = String(name).toLowerCase();
        let s = 0;

        if (n.includes("ex99")) s += 100;
        if (n.includes("exhibit99")) s += 100;
        if (n.includes("99-1")) s += 90;
        if (n.includes("99.1")) s += 90;
        if (n.includes("ex991")) s += 95;

        if (n.includes("earnings")) s += 60;
        if (n.includes("release")) s += 50;
        if (n.includes("press")) s += 40;
        if (n.includes("results")) s += 35;

        // Preferir HTML antes que PDF por ahora (más fácil)
        if (n.endsWith(".htm") || n.endsWith(".html")) s += 25;
        if (n.endsWith(".pdf")) s -= 10;

        // Evitar docs del header
        if (n.includes("primary") || n.includes("msft-20260128.htm")) s -= 30;

        return s;
    };

    const ranked = [...docs].sort((a, b) => scoreDoc(b.name) - scoreDoc(a.name));

    return ranked.length ? ranked[0] : null;
}

function buildFilingFileUrl({ cik, accessionNumber, filename }) {
    const cikNum = String(cik).replace(/^0+/, "");
    const acc = accessionNoNoDashes(accessionNumber);
    return `https://www.sec.gov/Archives/edgar/data/${cikNum}/${acc}/${filename}`;
}

module.exports = {
    listFilingFiles,
    pickBestExhibitDoc,
    buildFilingFileUrl,
};
