import { useEffect, useMemo, useState } from 'react';

import type { SectorCode } from '../../../types/macro.types';
import { SECTORS } from '../../../utils/constants';

import {
    fetchSectorFundamentals,
    type FundamentalSnapshot,
    type SectorFundamentalsResponse,
} from '../../../services/fundamentalService';

import { scoreFundamentals } from '../utils/scoring';
import { SectorComparablesTable } from './SectorComparablesTable';
import { CompanyDrawer } from './CompanyDrawer';

function isFiniteNumber(v: unknown): v is number {
    return typeof v === 'number' && Number.isFinite(v);
}

function median(values: Array<number | null | undefined>) {
    const arr = values.filter((v): v is number => isFiniteNumber(v)).sort((a, b) => a - b);
    if (!arr.length) return undefined;
    const mid = Math.floor(arr.length / 2);
    if (arr.length % 2 === 0) return (arr[mid - 1] + arr[mid]) / 2;
    return arr[mid];
}

function fmt(v: number | null | undefined, d = 2) {
    if (!isFiniteNumber(v)) return '—';
    return v.toFixed(d);
}

function fmtInt(v: number | null | undefined) {
    if (!isFiniteNumber(v)) return '—';
    return String(Math.round(v));
}

function fmtUsd(v: number | null | undefined) {
    if (!isFiniteNumber(v)) return '—';
    return `$${v.toFixed(2)}`;
}

function fmtPct(v: number | null | undefined) {
    if (!isFiniteNumber(v)) return '—';
    return `${v.toFixed(1)}%`;
}

function fmtRoe(v: number | null | undefined) {
    if (!isFiniteNumber(v)) return '—';
    const asPct = v <= 1 ? v * 100 : v;
    return `${asPct.toFixed(1)}%`;
}

function sectorList(): SectorCode[] {
    return Object.keys(SECTORS) as SectorCode[];
}

export function FundamentalDashboard() {
    const [sector, setSector] = useState<SectorCode>('XLK');

    const [items, setItems] = useState<FundamentalSnapshot[]>([]);
    const [meta, setMeta] = useState<{ asOf?: string; source?: string }>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [selected, setSelected] = useState<(FundamentalSnapshot & any) | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const load = async (s: SectorCode) => {
        try {
            setLoading(true);
            setError(null);

            const res: SectorFundamentalsResponse = await fetchSectorFundamentals(s);
            setItems(Array.isArray(res.items) ? res.items : []);
            setMeta({ asOf: res.asOf, source: res.source });

            // reset selección al cambiar sector
            setSelected(null);
            setDrawerOpen(false);
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Unknown error';
            setError(msg);
            setItems([]);
            setMeta({});
            setSelected(null);
            setDrawerOpen(false);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load(sector);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sector]);

    const scored = useMemo(() => scoreFundamentals(items), [items]);

    const top3 = useMemo(() => {
        return [...scored].sort((a, b) => b.score - a.score).slice(0, 3);
    }, [scored]);

    const peerStats = useMemo(() => {
        // medianas por sector: defendibles y útiles para “vs peers”
        return {
            pe: median(scored.map((x) => x.pe)),
            ps: median(scored.map((x) => x.ps)),
            pb: median(scored.map((x) => x.pb)),
            evEbitda: median(scored.map((x) => x.evEbitda)),
            roe: median(scored.map((x) => x.roe)),
            operatingMargin: median(scored.map((x) => x.operatingMargin)),
            grossMargin: median(scored.map((x) => x.grossMargin)),
            netMargin: median(scored.map((x) => x.netMargin)),
            revenueGrowthYoY: median(scored.map((x) => x.revenueGrowthYoY)),
            epsGrowthYoY: median(scored.map((x) => x.epsGrowthYoY)),
            beta: median(scored.map((x) => x.beta)),
            debtToEquity: median(scored.map((x) => x.debtToEquity)),
            currentRatio: median(scored.map((x) => x.currentRatio)),
        };
    }, [scored]);

    const openDrawer = (it: any) => {
        setSelected(it);
        setDrawerOpen(true);
    };

    const closeDrawer = () => {
        setDrawerOpen(false);
    };

    const container: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
    };

    const card: React.CSSProperties = {
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.10)',
        background: 'rgba(255,255,255,0.03)',
        padding: 12,
    };

    const row: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 12,
    };

    const btnBase: React.CSSProperties = {
        borderRadius: 10,
        border: '1px solid rgba(255,255,255,0.12)',
        background: 'rgba(255,255,255,0.04)',
        color: 'rgba(255,255,255,0.90)',
        padding: '8px 10px',
        cursor: 'pointer',
        fontWeight: 800,
        fontSize: 12,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
    };

    return (
        <div style={container}>
            {/* Header */}
            <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                        <div style={{ fontWeight: 900, fontSize: 16 }}>Fundamental — Sector Drilldown</div>
                        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                            Seleccioná sector → compará empresas → shortlist → click para memo/checklist.
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button
                            style={{
                                ...btnBase,
                                background: 'rgba(0,255,136,0.10)',
                                border: '1px solid rgba(0,255,136,0.22)',
                            }}
                            onClick={() => load(sector)}
                            disabled={loading}
                        >
                            {loading ? 'Cargando…' : 'Refresh'}
                        </button>

                        <div style={{ fontSize: 11, opacity: 0.7, textAlign: 'right' }}>
                            <div>
                                <b>Sector:</b> {sector} — {SECTORS[sector]}
                            </div>
                            <div>
                                <b>As of:</b> {meta.asOf ?? '—'} · <b>Source:</b> {meta.source ?? '—'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sector buttons */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                    {sectorList().map((code) => {
                        const active = code === sector;
                        return (
                            <button
                                key={code}
                                onClick={() => setSector(code)}
                                style={{
                                    ...btnBase,
                                    background: active ? 'rgba(0,217,255,0.12)' : btnBase.background,
                                    border: active ? '1px solid rgba(0,217,255,0.30)' : btnBase.border,
                                }}
                            >
                                <span style={{ fontWeight: 900 }}>{code}</span>
                                <span style={{ opacity: 0.75 }}>{SECTORS[code]}</span>
                            </button>
                        );
                    })}
                </div>

                {error && (
                    <div style={{ marginTop: 12, padding: 10, borderRadius: 12, background: 'rgba(255,68,68,0.12)' }}>
                        <b>Error:</b> {error}
                    </div>
                )}
            </div>

            {/* Quick cards */}
            <div style={row}>
                {scored.slice(0, 4).map((it) => (
                    <div
                        key={it.ticker}
                        style={{ ...card, cursor: 'pointer' }}
                        onClick={() => openDrawer(it)}
                        title="Abrir memo / checklist"
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                            <div>
                                <div style={{ fontWeight: 900 }}>{it.ticker}</div>
                                <div style={{ fontSize: 12, opacity: 0.7 }}>{it.name}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 900, fontSize: 18 }}>{fmtInt(it.score)}</div>
                                <div style={{ fontSize: 11, opacity: 0.7 }}>score</div>
                            </div>
                        </div>

                        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, fontSize: 12 }}>
                            <div>
                                <div style={{ opacity: 0.7 }}>Price</div>
                                <div style={{ fontWeight: 900 }}>{fmtUsd(it.price)}</div>
                            </div>
                            <div>
                                <div style={{ opacity: 0.7 }}>Beta</div>
                                <div style={{ fontWeight: 900 }}>{fmt(it.beta, 2)}</div>
                            </div>
                            <div>
                                <div style={{ opacity: 0.7 }}>P/E</div>
                                <div style={{ fontWeight: 900 }}>{fmt(it.pe, 1)}</div>
                            </div>
                            <div>
                                <div style={{ opacity: 0.7 }}>EV/EBITDA</div>
                                <div style={{ fontWeight: 900 }}>{fmt(it.evEbitda, 1)}</div>
                            </div>
                        </div>

                        <div style={{ marginTop: 10, fontSize: 11, opacity: 0.65 }}>
                            As of {it.asOf} · {it.source}
                        </div>
                    </div>
                ))}
            </div>

            {/* Shortlist + Comparables */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
                {/* Shortlist */}
                <div style={card}>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Shortlist (Top 3)</div>
                    <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 10 }}>
                        Click para abrir memo y checklist.
                    </div>

                    {top3.map((it) => (
                        <div
                            key={it.ticker}
                            onClick={() => openDrawer(it)}
                            style={{
                                borderRadius: 14,
                                border: '1px solid rgba(255,255,255,0.08)',
                                background: 'rgba(0,255,136,0.06)',
                                padding: 10,
                                marginBottom: 10,
                                cursor: 'pointer',
                            }}
                            title="Abrir memo / checklist"
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                                <div>
                                    <div style={{ fontWeight: 900 }}>{it.ticker}</div>
                                    <div style={{ fontSize: 11, opacity: 0.7 }}>{it.name}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 900 }}>{fmtInt(it.score)}</div>
                                    <div style={{ fontSize: 11, opacity: 0.7 }}>score</div>
                                </div>
                            </div>

                            <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, fontSize: 11 }}>
                                <div>
                                    Value<br />
                                    <b>{fmtInt(it.buckets.value)}</b>
                                </div>
                                <div>
                                    Quality<br />
                                    <b>{fmtInt(it.buckets.quality)}</b>
                                </div>
                                <div>
                                    Growth<br />
                                    <b>{fmtInt(it.buckets.growth)}</b>
                                </div>
                                <div>
                                    Risk<br />
                                    <b>{fmtInt(it.buckets.risk)}</b>
                                </div>
                            </div>

                            <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: 12 }}>
                                <div>
                                    <div style={{ opacity: 0.7 }}>ROE</div>
                                    <div style={{ fontWeight: 900 }}>{fmtRoe(it.roe)}</div>
                                </div>
                                <div>
                                    <div style={{ opacity: 0.7 }}>Op Margin</div>
                                    <div style={{ fontWeight: 900 }}>{fmtPct(it.operatingMargin)}</div>
                                </div>
                                <div>
                                    <div style={{ opacity: 0.7 }}>Rev YoY</div>
                                    <div style={{ fontWeight: 900 }}>{fmtPct(it.revenueGrowthYoY)}</div>
                                </div>
                            </div>

                            <div style={{ marginTop: 8, fontSize: 11, opacity: 0.65 }}>
                                As of {it.asOf} · {it.source}
                            </div>
                        </div>
                    ))}

                    {!top3.length && (
                        <div style={{ fontSize: 12, opacity: 0.7 }}>
                            No hay datos todavía para este sector.
                        </div>
                    )}
                </div>

                {/* Comparables table */}
                <SectorComparablesTable
                    items={scored}
                    selectedTicker={selected?.ticker ?? null}
                    onSelect={(it) => openDrawer(it)}
                />
            </div>

            {/* Notes */}
            <div style={card}>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Notas</div>
                <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.5 }}>
                    • El panel lateral genera un memo <b>rule-based</b> (defendible): interpreta solo métricas presentes, sin inventar.<br />
                    • Comparación “vs mediana” es intra-sectorial (evita comparar peras con manzanas).<br />
                    • Esto prioriza research: el “timing” y el veredicto final se completan con due diligence cualitativa.
                </div>
            </div>

            {/* Drawer */}
            <CompanyDrawer open={drawerOpen} item={selected} peerStats={peerStats} onClose={closeDrawer} />
        </div>
    );
}
