// src/services/fundamentalService.ts

import type {
    FundamentalSnapshot,
    SectorEtfSymbol,
    SectorFundamentalsResponse,
} from "../types/fundamental.types";

export async function fetchFundamentals(symbol: string): Promise<FundamentalSnapshot> {
    const t = symbol.trim().toUpperCase();
    const r = await fetch(`/api/yf/snapshot/${encodeURIComponent(t)}`);
    const txt = await r.text();
    if (!r.ok) throw new Error(txt.slice(0, 200));
    return JSON.parse(txt);
}

export async function fetchSectorFundamentals(
    sectorEtf: SectorEtfSymbol,
    opts?: { top?: number; concurrency?: number }
): Promise<SectorFundamentalsResponse> {
    const top = opts?.top ?? 100;  // ✅ Cambiar de 25 a 100
    const concurrency = opts?.concurrency ?? 6;

    const r = await fetch(
        `/api/yf/sector/${encodeURIComponent(sectorEtf)}?top=${top}&concurrency=${concurrency}`
    );
    const txt = await r.text();
    if (!r.ok) throw new Error(txt.slice(0, 200));
    return JSON.parse(txt);
}