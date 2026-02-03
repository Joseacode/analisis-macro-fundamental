// src/services/earningsService.ts

import type { EarningsBundle } from "../types/earnings.types";

export async function fetchEarnings(symbol: string): Promise<EarningsBundle> {
    const t = symbol.trim().toUpperCase();
    const r = await fetch(`/api/earnings/sec/${encodeURIComponent(t)}`);
    const txt = await r.text();
    if (!r.ok) throw new Error(txt.slice(0, 200));
    return JSON.parse(txt);
}

