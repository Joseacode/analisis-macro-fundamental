// src/features/fundamental/components/SectorComparablesTable.tsx
import { useMemo, useState } from 'react';
import type { ScoredFundamental } from '../utils/scoring';

type SortKey =
    | 'ticker'
    | 'price'
    | 'score'
    | 'pe'
    | 'pb'
    | 'ps'
    | 'evEbitda'
    | 'roe'
    | 'operatingMargin'
    | 'revenueGrowthYoY'
    | 'debtToEquity'
    | 'beta';

function num(v: number | null) {
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function fmt(v: number | null, d = 2) {
    const n = num(v);
    return n === null ? '—' : n.toFixed(d);
}

function fmtPct(v: number | null) {
    const n = num(v);
    return n === null ? '—' : `${n.toFixed(1)}%`;
}

function fmtUsd(v: number | null) {
    const n = num(v);
    return n === null ? '—' : `$${n.toFixed(2)}`;
}

export function SectorComparablesTable({ items }: { items: ScoredFundamental[] }) {
    const [sortKey, setSortKey] = useState<SortKey>('score');
    const [desc, setDesc] = useState(true);

    const sorted = useMemo(() => {
        const arr = [...items];

        arr.sort((a, b) => {
            const av = a[sortKey as keyof ScoredFundamental] as any;
            const bv = b[sortKey as keyof ScoredFundamental] as any;

            // string
            if (sortKey === 'ticker') {
                return desc ? b.ticker.localeCompare(a.ticker) : a.ticker.localeCompare(b.ticker);
            }

            // number-ish
            const an = typeof av === 'number' ? av : num(av) ?? -Infinity;
            const bn = typeof bv === 'number' ? bv : num(bv) ?? -Infinity;

            return desc ? bn - an : an - bn;
        });

        return arr;
    }, [items, sortKey, desc]);

    function toggle(k: SortKey) {
        if (k === sortKey) setDesc(!desc);
        else {
            setSortKey(k);
            setDesc(true);
        }
    }

    const headBtn: React.CSSProperties = {
        background: 'transparent',
        border: 'none',
        color: 'rgba(255,255,255,0.85)',
        cursor: 'pointer',
        fontWeight: 700,
        fontSize: 12,
        padding: 0,
    };

    const cell: React.CSSProperties = { padding: '10px 8px', fontSize: 12, opacity: 0.9, whiteSpace: 'nowrap' };

    return (
        <div
            style={{
                borderRadius: 16,
                border: '1px solid rgba(255,255,255,0.10)',
                background: 'rgba(255,255,255,0.03)',
                overflow: 'hidden',
            }}
        >
            <div style={{ padding: '10px 12px', fontWeight: 800 }}>Comparables</div>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
                    <thead>
                        <tr style={{ borderTop: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <th style={{ ...cell, textAlign: 'left' }}>
                                <button style={headBtn} onClick={() => toggle('ticker')}>Ticker</button>
                            </th>
                            <th style={{ ...cell, textAlign: 'right' }}>
                                <button style={headBtn} onClick={() => toggle('price')}>Price</button>
                            </th>
                            <th style={{ ...cell, textAlign: 'right' }}>
                                <button style={headBtn} onClick={() => toggle('score')}>Score</button>
                            </th>
                            <th style={{ ...cell, textAlign: 'right' }}><button style={headBtn} onClick={() => toggle('pe')}>P/E</button></th>
                            <th style={{ ...cell, textAlign: 'right' }}><button style={headBtn} onClick={() => toggle('pb')}>P/B</button></th>
                            <th style={{ ...cell, textAlign: 'right' }}><button style={headBtn} onClick={() => toggle('evEbitda')}>EV/EBITDA</button></th>
                            <th style={{ ...cell, textAlign: 'right' }}><button style={headBtn} onClick={() => toggle('roe')}>ROE</button></th>
                            <th style={{ ...cell, textAlign: 'right' }}><button style={headBtn} onClick={() => toggle('operatingMargin')}>Op Mgn</button></th>
                            <th style={{ ...cell, textAlign: 'right' }}><button style={headBtn} onClick={() => toggle('revenueGrowthYoY')}>Rev YoY</button></th>
                            <th style={{ ...cell, textAlign: 'right' }}><button style={headBtn} onClick={() => toggle('debtToEquity')}>D/E</button></th>
                            <th style={{ ...cell, textAlign: 'right' }}><button style={headBtn} onClick={() => toggle('beta')}>Beta</button></th>
                        </tr>
                    </thead>

                    <tbody>
                        {sorted.map((it) => (
                            <tr key={it.ticker} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <td style={{ ...cell, textAlign: 'left' }}>
                                    <div style={{ fontWeight: 800 }}>{it.ticker}</div>
                                    <div style={{ fontSize: 11, opacity: 0.65 }}>{it.name}</div>
                                </td>
                                <td style={{ ...cell, textAlign: 'right' }}>{fmtUsd(it.price)}</td>
                                <td style={{ ...cell, textAlign: 'right', fontWeight: 800 }}>{fmt(it.score, 0)}</td>
                                <td style={{ ...cell, textAlign: 'right' }}>{fmt(it.pe, 1)}</td>
                                <td style={{ ...cell, textAlign: 'right' }}>{fmt(it.pb, 1)}</td>
                                <td style={{ ...cell, textAlign: 'right' }}>{fmt(it.evEbitda, 1)}</td>
                                <td style={{ ...cell, textAlign: 'right' }}>{fmtPct(it.roe ? it.roe * 100 : null)}</td>
                                <td style={{ ...cell, textAlign: 'right' }}>{fmtPct(it.operatingMargin)}</td>
                                <td style={{ ...cell, textAlign: 'right' }}>{fmtPct(it.revenueGrowthYoY)}</td>
                                <td style={{ ...cell, textAlign: 'right' }}>{fmt(it.debtToEquity, 2)}</td>
                                <td style={{ ...cell, textAlign: 'right' }}>{fmt(it.beta, 2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div style={{ padding: '10px 12px', fontSize: 11, opacity: 0.65 }}>
                Score = ranking relativo dentro del sector (no predicción). Útil para priorizar research.
            </div>
        </div>
    );
}
