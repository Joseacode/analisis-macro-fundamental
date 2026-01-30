export async function yfQuote(symbol: string) {
    const r = await fetch(`/api/yf/quote/${encodeURIComponent(symbol)}`);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
}

export async function yfChart(symbol: string, opts?: { range?: string; interval?: string }) {
    const qs = new URLSearchParams({
        range: opts?.range ?? "5y",
        interval: opts?.interval ?? "1d"
    });
    const r = await fetch(`/api/yf/chart/${encodeURIComponent(symbol)}?${qs.toString()}`);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
}

export async function yfSummary(symbol: string) {
    const r = await fetch(`/api/yf/summary/${encodeURIComponent(symbol)}`);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
}
