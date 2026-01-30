// SectorComparablesTable.tsx

import type { ScoredItem } from './CompanyDrawer';

function isFiniteNumber(v: unknown): v is number {
    return typeof v === 'number' && Number.isFinite(v);
}

const formatters = {
    number: (v: number | null | undefined, decimals = 2) =>
        isFiniteNumber(v) ? v.toFixed(decimals) : '—',

    usd: (v: number | null | undefined) =>
        isFiniteNumber(v) ? `$${v.toFixed(2)}` : '—',

    pct: (v: number | null | undefined) =>
        isFiniteNumber(v) ? `${v.toFixed(1)}%` : '—',

    roe: (v: number | null | undefined) => {
        if (!isFiniteNumber(v)) return '—';
        const asPct = v <= 1 ? v * 100 : v;
        return `${asPct.toFixed(1)}%`;
    },
};

interface SectorComparablesTableProps {
    items: ScoredItem[];  // ✅ CAMBIO: ScoredFundamental → ScoredItem
    selectedTicker?: string | null;
    onSelect?: (item: ScoredItem) => void;  // ✅ CAMBIO: ScoredFundamental → ScoredItem
    showSectorColumn?: boolean;
}

export function SectorComparablesTable({
    items,
    selectedTicker,
    onSelect,
    showSectorColumn = false,
}: SectorComparablesTableProps) {
    const styles = {
        card: {
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.10)',
            background: 'rgba(255,255,255,0.03)',
            padding: 12,
        },
        table: {
            width: '100%',
            borderCollapse: 'collapse' as const,
            fontSize: 11,
        },
        th: {
            textAlign: 'left' as const,
            padding: '8px 6px',
            borderBottom: '1px solid rgba(255,255,255,0.10)',
            opacity: 0.75,
            fontWeight: 900 as const,
            whiteSpace: 'nowrap' as const,
            fontSize: 10,
        },
        tdBase: {
            padding: '8px 6px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            whiteSpace: 'nowrap' as const,
        },
    };

    const getRowStyle = (isSelected: boolean, hasOnSelect: boolean): React.CSSProperties => ({
        cursor: hasOnSelect ? 'pointer' : 'default',
        background: isSelected ? 'rgba(0,217,255,0.10)' : 'transparent',
        outline: isSelected ? '1px solid rgba(0,217,255,0.25)' : 'none',
        transition: 'all 0.2s ease',
    });

    const getCellStyle = (isSelected: boolean): React.CSSProperties => ({
        ...styles.tdBase,
        fontWeight: isSelected ? 900 : 700,
    });

    return (
        <div style={styles.card}>
            <h3 style={{ fontWeight: 900, marginBottom: 6, margin: 0 }}>
                Sector Comparables
            </h3>
            <p style={{ fontSize: 11, opacity: 0.7, marginBottom: 10, margin: '4px 0 10px 0' }}>
                {showSectorColumn
                    ? 'Resultados de búsqueda global · Click para análisis.'
                    : 'Todas las empresas del sector · Click para análisis.'}
            </p>

            <div style={{ overflowX: 'auto', maxHeight: 600, overflowY: 'auto' }}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>Ticker</th>
                            <th style={styles.th}>Name</th>
                            {showSectorColumn && <th style={styles.th}>Sector</th>}
                            <th style={styles.th}>Score</th>
                            <th style={styles.th}>Price</th>
                            <th style={styles.th}>Beta</th>
                            <th style={styles.th}>P/E</th>
                            <th style={styles.th}>P/S</th>
                            <th style={styles.th}>P/B</th>
                            <th style={styles.th}>EV/EBITDA</th>
                            <th style={styles.th}>ROE</th>
                            <th style={styles.th}>OpMgn</th>
                            <th style={styles.th}>NetMgn</th>
                            <th style={styles.th}>RevYoY</th>
                            <th style={styles.th}>EPSYoY</th>
                            <th style={styles.th}>D/E</th>
                            <th style={styles.th}>As of</th>
                        </tr>
                    </thead>

                    <tbody>
                        {items.map((it) => {
                            const isSelected = Boolean(selectedTicker && it.ticker === selectedTicker);
                            const rowStyle = getRowStyle(isSelected, Boolean(onSelect));
                            const cellStyle = getCellStyle(isSelected);

                            return (
                                <tr
                                    key={it.ticker}
                                    style={rowStyle}
                                    onClick={() => onSelect?.(it)}
                                    role={onSelect ? 'button' : undefined}
                                    tabIndex={onSelect ? 0 : undefined}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && onSelect) {
                                            onSelect(it);
                                        }
                                    }}
                                >
                                    <td style={cellStyle}>{it.ticker}</td>
                                    <td style={{ ...styles.tdBase, opacity: 0.9, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {it.name ?? '—'}
                                    </td>
                                    {showSectorColumn && (
                                        <td style={{ ...styles.tdBase, opacity: 0.75, fontSize: 10, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {it.sector ?? '—'}
                                        </td>
                                    )}
                                    <td style={{ ...cellStyle, fontWeight: 900 }}>
                                        {isFiniteNumber(it.score) ? Math.round(it.score) : '—'}
                                    </td>
                                    <td style={cellStyle}>{formatters.usd(it.price)}</td>
                                    <td style={cellStyle}>{formatters.number(it.beta, 2)}</td>
                                    <td style={cellStyle}>{formatters.number(it.pe, 1)}</td>
                                    <td style={cellStyle}>{formatters.number(it.ps, 1)}</td>
                                    <td style={cellStyle}>{formatters.number(it.pb, 1)}</td>
                                    <td style={cellStyle}>{formatters.number(it.evEbitda, 1)}</td>
                                    <td style={cellStyle}>{formatters.roe(it.roe)}</td>
                                    <td style={cellStyle}>{formatters.pct(it.operatingMargin)}</td>
                                    <td style={cellStyle}>{formatters.pct(it.netMargin)}</td>
                                    <td style={cellStyle}>{formatters.pct(it.revenueGrowthYoY)}</td>
                                    <td style={cellStyle}>{formatters.pct(it.epsGrowthYoY)}</td>
                                    <td style={cellStyle}>{formatters.number(it.debtToEquity, 1)}</td>
                                    <td style={{ ...styles.tdBase, opacity: 0.65, fontSize: 10 }}>{it.asOf ?? '—'}</td>
                                </tr>
                            );
                        })}

                        {!items.length && (
                            <tr>
                                <td
                                    style={{ ...styles.tdBase, opacity: 0.7, textAlign: 'center', padding: 20 }}
                                    colSpan={showSectorColumn ? 17 : 16}
                                >
                                    {showSectorColumn ? 'No se encontraron resultados.' : 'Sin datos para el sector seleccionado.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
