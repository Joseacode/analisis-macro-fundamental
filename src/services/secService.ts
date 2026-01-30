async function fetchJsonOrThrow(url: string) {
    const r = await fetch(url);
    const txt = await r.text();
    if (!r.ok) throw new Error(txt.slice(0, 300));
    try {
        return JSON.parse(txt);
    } catch {
        throw new Error(`Respuesta no-JSON: ${txt.slice(0, 120)}`);
    }
}

export async function secLatestFilingDocs(ticker: string, form: string) {
    const t = ticker.trim().toUpperCase();
    const url = `/api/sec/filings/${encodeURIComponent(t)}/latest-docs?form=${encodeURIComponent(form)}`;
    return fetchJsonOrThrow(url);
}

export function secDocUrl(params: { cik: string | number; accession: string; filename: string }) {
    const qs = new URLSearchParams({
        cik: String(params.cik),
        accession: params.accession,
        filename: params.filename,
    });
    return `/api/sec/doc?${qs.toString()}`;
}
