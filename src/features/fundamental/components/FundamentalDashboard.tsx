// src/features/fundamental/components/FundamentalDashboard.tsx
import { useEffect, useMemo, useState } from 'react';
import type { SectorCode } from '../../../types/macro.types';
import { SECTORS } from '../../../utils/constants';
import { fetchFundamentals, type FundamentalSnapshot } from '../../../services/fundamentalService';
import { scoreFundamentals } from '../utils/scoring';
import { SectorComparablesTable } from './SectorComparablesTable';


function fmtNum(v: number | null, digits = 2) {
    if (v === null || Number.isNaN(v)) return '—';
    return v.toFixed(digits);
}

function fmtPct(v: number | null) {
    if (v === null || Number.isNaN(v)) return '—';
    return `${v.toFixed(1)}%`;
}

function fmtUsd(v: number | null) {
    if (v === null || Number.isNaN(v)) return '—';
    return `$${v.toFixed(2)}`;
}

export function FundamentalDashboard() {
    const sectorList = useMemo(() => Object.keys(SECTORS) as SectorCode[], []);

    const [selectedSector, setSelectedSector] = useState<SectorCode>('XLK');
    const [items, setItems] = useState<FundamentalSnapshot[]>([]);
    const [asOf, setAsOf] = useState<string>('');
    const [source, setSource] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const scored = useMemo(() => scoreFundamentals(items), [items]);

    const top3 = useMemo(() => {
        return [...scored].sort((a, b) => b.score - a.score).slice(0, 3);
    }, [scored]);

    useEffect(() => {
        let alive = true;

        (async () => {
            setLoading(true);
            setError(null);

            try {
                const res = await fetchFundamentals(selectedSector);
                if (!alive) return;

                setItems(res.items);
                setAsOf(res.asOf);
                setSource(res.source);
            } catch (e) {
                console.error(e);
                if (!alive) return;
                setError('Failed to load fundamentals');
            } finally {
                if (!alive) return;
                setLoading(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [selectedSector]);

    return (
        <div style={{ padding: '16px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                <div>
                    <h2 style={{ margin: 0 }}>Fundamental</h2>
                    <div style={{ opacity: 0.7, fontSize: 12 }}>
                        Sector: <b>{selectedSector}</b> — {SECTORS[selectedSector]} {asOf ? ` | As of ${asOf}` : ''}{' '}
                        {source ? `(${source})` : ''}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {sectorList.map((code) => (
                        <button
                            key={code}
                            onClick={() => setSelectedSector(code)}
                            style={{
                                padding: '6px 10px',
                                borderRadius: 10,
                                border: code === selectedSector ? '1px solid #00ff88' : '1px solid rgba(255,255,255,0.15)',
                                background: code === selectedSector ? 'rgba(0,255,136,0.12)' : 'rgba(255,255,255,0.04)',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: 12,
                            }}
                            title={SECTORS[code]}
                        >
                            {code}
                        </button>
                    ))}
                </div>
            </div>

            {/* Body */}
            <div style={{ marginTop: 12 }}>
                {loading && <div style={{ opacity: 0.8 }}>Loading…</div>}
                {error && <div style={{ color: '#ff6666' }}>{error}</div>}
            </div>

            <div
                style={{
                    marginTop: 12,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: 12,
                }}
            >
                {items.map((it) => (
                    <div
                        key={it.ticker}
                        style={{
                            borderRadius: 16,
                            border: '1px solid rgba(255,255,255,0.10)',
                            background: 'rgba(255,255,255,0.03)',
                            padding: 12,
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                            <div>
                                <div style={{ fontWeight: 700 }}>{it.ticker}</div>
                                <div style={{ fontSize: 12, opacity: 0.75 }}>{it.name}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 700 }}>{fmtUsd(it.price)}</div>
                                <div style={{ fontSize: 12, opacity: 0.75 }}>β {fmtNum(it.beta, 2)}</div>
                            </div>
                        </div>

                        <div
                            style={{
                                marginTop: 10,
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                                gap: 8,
                                fontSize: 12,
                            }}
                        >
                            <div>PE: <b>{fmtNum(it.pe, 1)}</b></div>
                            <div>PB: <b>{fmtNum(it.pb, 1)}</b></div>
                            <div>PS: <b>{fmtNum(it.ps, 1)}</b></div>
                            <div>EV/EBITDA: <b>{fmtNum(it.evEbitda, 1)}</b></div>

                            <div>Gross Mgn: <b>{fmtPct(it.grossMargin)}</b></div>
                            <div>Op Mgn: <b>{fmtPct(it.operatingMargin)}</b></div>
                            <div>Net Mgn: <b>{fmtPct(it.netMargin)}</b></div>
                            <div>ROE: <b>{fmtPct(it.roe ? it.roe * 100 : null)}</b></div>

                            <div>Current Ratio: <b>{fmtNum(it.currentRatio, 2)}</b></div>
                            <div>D/E: <b>{fmtNum(it.debtToEquity, 2)}</b></div>

                            <div>EPS YoY: <b>{fmtPct(it.epsGrowthYoY)}</b></div>
                            <div>Rev YoY: <b>{fmtPct(it.revenueGrowthYoY)}</b></div>
                        </div>

                        <div style={{ marginTop: 10, fontSize: 11, opacity: 0.65 }}>
                            As of {it.asOf} · {it.source}
                        </div>
                    </div>
                ))}


            </div>

            {/* Shortlist + Comparables */}
            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
                <div
                    style={{
                        borderRadius: 16,
                        border: '1px solid rgba(255,255,255,0.10)',
                        background: 'rgba(255,255,255,0.03)',
                        padding: 12,
                    }}
                >
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Shortlist (Top 3)</div>
                    <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 10 }}>
                        Top relativo dentro del sector (Value/Quality/Growth/Risk).
                    </div>

                    {top3.map((it) => (
                        <div
                            key={it.ticker}
                            style={{
                                borderRadius: 14,
                                border: '1px solid rgba(255,255,255,0.08)',
                                background: 'rgba(0,255,136,0.06)',
                                padding: 10,
                                marginBottom: 10,
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                                <div>
                                    <div style={{ fontWeight: 900 }}>{it.ticker}</div>
                                    <div style={{ fontSize: 11, opacity: 0.7 }}>{it.name}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 900 }}>{Math.round(it.score)}</div>
                                    <div style={{ fontSize: 11, opacity: 0.7 }}>score</div>
                                </div>
                            </div>

                            <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, fontSize: 11 }}>
                                <div>Value<br /><b>{Math.round(it.buckets.value)}</b></div>
                                <div>Quality<br /><b>{Math.round(it.buckets.quality)}</b></div>
                                <div>Growth<br /><b>{Math.round(it.buckets.growth)}</b></div>
                                <div>Risk<br /><b>{Math.round(it.buckets.risk)}</b></div>
                            </div>

                            <div style={{ marginTop: 8, fontSize: 11, opacity: 0.65 }}>
                                As of {it.asOf} · {it.source}
                            </div>
                        </div>
                    ))}
                </div>

                <SectorComparablesTable items={scored} />
            </div>

        </div>
    );
}
