import type { FundamentalSnapshot } from '../../../services/fundamentalService';

type Buckets = { value: number; quality: number; growth: number; risk: number };

export type ComparableRow = FundamentalSnapshot & {
    score?: number;
    buckets?: Buckets;
};

function isFiniteNumber(v: unknown): v is number {
    return typeof v === 'number' && Number.isFinite(v);
}

function fmt(v: number | null | undefined, d = 2) {
    if (!isFiniteNumber(v)) return '—';
    return v.toFixed(d);
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

export function SectorComparablesTable({
    items,
    selectedTicker,
    onSelect,
}: {
    items: ComparableRow[];
    selectedTicker?: string | null;
    onSelect?: (item: ComparableRow) => void;
}) {
    const card: React.CSSProperties = {
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.10)',
        background: 'rgba(255,255,255,0.03)',
        padding: 12,
    };

    const table: React.CSSProperties = {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: 12,
    };

    const th: React.CSSProperties = {
        textAlign: 'left',
        padding: '10px 8px',
        borderBottom: '1px solid rgba(255,255,255,0.10)',
        opacity: 0.75,
        fontWeight: 900,
        whiteSpace: 'nowrap',
    };

    const tdBase: React.CSSProperties = {
        padding: '10px 8px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        whiteSpace: 'nowrap',
    };

    return (
        <div style={card}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Sector Comparables</div>
            <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 10 }}>
                Click en una fila para abrir el panel lateral (memo + checklist + comparación).
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={table}>
                    <thead>
                        <tr>
                            <th style={th}>Ticker</th>
                            <th style={th}>Name</th>
                            <th style={th}>Score</th>
                            <th style={th}>Price</th>
                            <th style={th}>Beta</th>
                            <th style={th}>P/E</th>
                            <th style={th}>EV/EBITDA</th>
                            <th style={th}>ROE</th>
                            <th style={th}>Op Margin</th>
                            <th style={th}>Rev YoY</th>
                            <th style={th}>EPS YoY</th>
                            <th style={th}>As of</th>
                        </tr>
                    </thead>

                    <tbody>
                        {items.map((it) => {
                            const isSelected = selectedTicker && it.ticker === selectedTicker;

                            const tr: React.CSSProperties = {
                                cursor: onSelect ? 'pointer' : 'default',
                                background: isSelected ? 'rgba(0,217,255,0.10)' : 'transparent',
                                outline: isSelected ? '1px solid rgba(0,217,255,0.25)' : 'none',
                            };

                            const td: React.CSSProperties = {
                                ...tdBase,
                                fontWeight: isSelected ? 900 : 700,
                            };

                            return (
                                <tr key={it.ticker} style={tr} onClick={() => onSelect?.(it)}>
                                    <td style={td}>{it.ticker}</td>
                                    <td style={{ ...tdBase, opacity: 0.9 }}>{it.name}</td>
                                    <td style={td}>{isFiniteNumber(it.score) ? Math.round(it.score) : '—'}</td>
                                    <td style={td}>{fmtUsd(it.price)}</td>
                                    <td style={td}>{fmt(it.beta, 2)}</td>
                                    <td style={td}>{fmt(it.pe, 1)}</td>
                                    <td style={td}>{fmt(it.evEbitda, 1)}</td>
                                    <td style={td}>{fmtRoe(it.roe)}</td>
                                    <td style={td}>{fmtPct(it.operatingMargin)}</td>
                                    <td style={td}>{fmtPct(it.revenueGrowthYoY)}</td>
                                    <td style={td}>{fmtPct(it.epsGrowthYoY)}</td>
                                    <td style={{ ...tdBase, opacity: 0.75 }}>{it.asOf ?? '—'}</td>
                                </tr>
                            );
                        })}

                        {!items.length ? (
                            <tr>
                                <td style={{ ...tdBase, opacity: 0.7 }} colSpan={12}>
                                    Sin datos para el sector seleccionado.
                                </td>
                            </tr>
                        ) : null}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
