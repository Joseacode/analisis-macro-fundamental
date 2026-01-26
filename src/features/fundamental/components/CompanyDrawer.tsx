import { useEffect, useMemo, useState } from 'react';
import type { FundamentalSnapshot } from '../../../services/fundamentalService';
import type { SectorCode } from '../../../types/macro.types';
import { SECTORS } from '../../../utils/constants';

type Buckets = { value: number; quality: number; growth: number; risk: number };

type DrawerItem = FundamentalSnapshot & {
    score?: number;
    buckets?: Buckets;
};

type PeerStats = Partial<
    Record<
        | 'pe'
        | 'ps'
        | 'pb'
        | 'evEbitda'
        | 'roe'
        | 'operatingMargin'
        | 'grossMargin'
        | 'netMargin'
        | 'revenueGrowthYoY'
        | 'epsGrowthYoY'
        | 'beta'
        | 'debtToEquity'
        | 'currentRatio',
        number
    >
>;

function isFiniteNumber(v: unknown): v is number {
    return typeof v === 'number' && Number.isFinite(v);
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

function diffLabel(v?: number | null, median?: number) {
    if (!isFiniteNumber(v) || !isFiniteNumber(median) || median === 0) return null;
    const pct = ((v - median) / Math.abs(median)) * 100;
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct.toFixed(0)}% vs mediana`;
}

/**
 * Memo rule-based (defendible): no inventa datos.
 * Solo interpreta señales relativas (vs mediana) + umbrales razonables.
 */
function buildMemo(item: DrawerItem, peer: PeerStats) {
    const thesis: string[] = [];
    const drivers: string[] = [];
    const risks: string[] = [];
    const watch: string[] = [];
    const gaps: string[] = [];

    const peRel = diffLabel(item.pe, peer.pe);
    const evRel = diffLabel(item.evEbitda, peer.evEbitda);
    const roeRel = diffLabel(item.roe, peer.roe);
    const opRel = diffLabel(item.operatingMargin, peer.operatingMargin);
    const revRel = diffLabel(item.revenueGrowthYoY, peer.revenueGrowthYoY);
    const epsRel = diffLabel(item.epsGrowthYoY, peer.epsGrowthYoY);
    const betaRel = diffLabel(item.beta, peer.beta);

    // Value
    if (isFiniteNumber(item.pe) && isFiniteNumber(peer.pe)) {
        if (item.pe < peer.pe) thesis.push(`Valuation (P/E) más baja que la mediana del sector (${peRel}).`);
        else thesis.push(`Valuation (P/E) por encima de la mediana del sector (${peRel}).`);
    } else {
        gaps.push('P/E');
    }

    if (isFiniteNumber(item.evEbitda) && isFiniteNumber(peer.evEbitda)) {
        if (item.evEbitda < peer.evEbitda) thesis.push(`EV/EBITDA atractivo vs peers (${evRel}).`);
        else watch.push(`EV/EBITDA exigente vs peers (${evRel}).`);
    } else {
        gaps.push('EV/EBITDA');
    }

    // Quality
    if (isFiniteNumber(item.roe)) {
        drivers.push(`ROE ${fmtRoe(item.roe)} (${roeRel ?? 'sin mediana'}) → señal de rentabilidad/eficiencia.`);
    } else gaps.push('ROE');

    if (isFiniteNumber(item.operatingMargin)) {
        drivers.push(`Operating margin ${fmtPct(item.operatingMargin)} (${opRel ?? 'sin mediana'}).`);
    } else gaps.push('Operating margin');

    if (isFiniteNumber(item.grossMargin)) {
        drivers.push(`Gross margin ${fmtPct(item.grossMargin)}.`);
    }
    if (isFiniteNumber(item.netMargin)) {
        drivers.push(`Net margin ${fmtPct(item.netMargin)}.`);
    }

    // Growth
    if (isFiniteNumber(item.revenueGrowthYoY)) {
        drivers.push(`Revenue YoY ${fmtPct(item.revenueGrowthYoY)} (${revRel ?? 'sin mediana'}).`);
    } else gaps.push('Revenue YoY');

    if (isFiniteNumber(item.epsGrowthYoY)) {
        drivers.push(`EPS YoY ${fmtPct(item.epsGrowthYoY)} (${epsRel ?? 'sin mediana'}).`);
    } else gaps.push('EPS YoY');

    // Risk
    if (isFiniteNumber(item.beta)) {
        if (item.beta > 1.2) risks.push(`Beta elevada (${fmt(item.beta, 2)}) → sensibilidad a mercado (risk-on/risk-off).`);
        else drivers.push(`Beta contenida (${fmt(item.beta, 2)}) → volatilidad relativa moderada.`);
        if (betaRel) watch.push(`Beta: ${betaRel}.`);
    } else gaps.push('Beta');

    if (isFiniteNumber(item.debtToEquity)) {
        if (item.debtToEquity > 1.2) risks.push(`Apalancamiento alto (Debt/Equity ${fmt(item.debtToEquity, 2)}).`);
        else drivers.push(`Apalancamiento razonable (Debt/Equity ${fmt(item.debtToEquity, 2)}).`);
    } else gaps.push('Debt/Equity');

    if (isFiniteNumber(item.currentRatio)) {
        if (item.currentRatio < 1) risks.push(`Liquidez ajustada (Current ratio ${fmt(item.currentRatio, 2)}).`);
        else drivers.push(`Liquidez OK (Current ratio ${fmt(item.currentRatio, 2)}).`);
    } else gaps.push('Current ratio');

    // Guardrails (si no hay nada, no inventar)
    if (!thesis.length) thesis.push('Sin suficientes métricas para tesis cuantitativa (faltan datos clave).');

    // Watchlist universal (defendible)
    watch.push('Revisar último earnings/guidance (consistencia de márgenes y crecimiento).');
    watch.push('Chequear calidad de crecimiento (price vs volume, share count, buybacks/dilution).');
    watch.push('Validar comparabilidad: TTM/FY, calendario fiscal, moneda y unidades.');

    return { thesis, drivers, risks, watch, gaps };
}

export function CompanyDrawer({
    open,
    item,
    peerStats,
    onClose,
}: {
    open: boolean;
    item: DrawerItem | null;
    peerStats: PeerStats;
    onClose: () => void;
}) {
    // ESC para cerrar
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    const memo = useMemo(() => {
        if (!item) return null;
        return buildMemo(item, peerStats);
    }, [item, peerStats]);

    const [checks, setChecks] = useState<Record<string, boolean>>({});

    useEffect(() => {
        // reset checks al cambiar empresa
        if (item?.ticker) setChecks({});
    }, [item?.ticker]);

    if (!open || !item) return null;

    const sectorName = (item.sector as SectorCode) && SECTORS[item.sector as SectorCode]
        ? `${item.sector} — ${SECTORS[item.sector as SectorCode]}`
        : item.sector ?? '—';

    const overlay: React.CSSProperties = {
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        zIndex: 999,
    };

    const panel: React.CSSProperties = {
        position: 'fixed',
        top: 0,
        right: 0,
        height: '100vh',
        width: 'min(560px, 94vw)',
        background: 'rgba(10,14,28,0.98)',
        borderLeft: '1px solid rgba(255,255,255,0.10)',
        boxShadow: '0 0 40px rgba(0,0,0,0.45)',
        zIndex: 1000,
        padding: 14,
        overflow: 'auto',
    };

    const card: React.CSSProperties = {
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.10)',
        background: 'rgba(255,255,255,0.03)',
        padding: 12,
    };

    const h2: React.CSSProperties = { fontSize: 13, fontWeight: 900, marginBottom: 8 };
    const label: React.CSSProperties = { fontSize: 11, opacity: 0.70 };
    const value: React.CSSProperties = { fontSize: 13, fontWeight: 900 };

    const chk = (k: string, text: string) => (
        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
            <input
                type="checkbox"
                checked={!!checks[k]}
                onChange={() => setChecks((p) => ({ ...p, [k]: !p[k] }))}
                style={{ marginTop: 2 }}
            />
            <span style={{ fontSize: 12, opacity: 0.85, lineHeight: 1.35 }}>{text}</span>
        </label>
    );

    return (
        <>
            <div style={overlay} onClick={onClose} />
            <aside style={panel}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ fontWeight: 900, fontSize: 18 }}>
                            {item.ticker} <span style={{ opacity: 0.7, fontWeight: 800 }}>·</span>{' '}
                            <span style={{ fontWeight: 800, opacity: 0.92 }}>{item.name}</span>
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                            <b>Sector:</b> {sectorName} · <b>As of:</b> {item.asOf ?? '—'} · <b>Source:</b> {item.source ?? '—'}
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        style={{
                            borderRadius: 10,
                            border: '1px solid rgba(255,255,255,0.12)',
                            background: 'rgba(255,255,255,0.04)',
                            color: 'rgba(255,255,255,0.90)',
                            padding: '8px 10px',
                            cursor: 'pointer',
                            fontWeight: 900,
                            fontSize: 12,
                        }}
                    >
                        Close
                    </button>
                </div>

                {/* Snapshot */}
                <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                    <div style={card}>
                        <div style={label}>Price</div>
                        <div style={value}>{fmtUsd(item.price)}</div>
                    </div>
                    <div style={card}>
                        <div style={label}>Score</div>
                        <div style={value}>{fmtInt(item.score)}</div>
                        {item.buckets && (
                            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 6 }}>
                                Value {fmtInt(item.buckets.value)} · Quality {fmtInt(item.buckets.quality)} · Growth{' '}
                                {fmtInt(item.buckets.growth)} · Risk {fmtInt(item.buckets.risk)}
                            </div>
                        )}
                    </div>
                </div>

                {/* Key ratios */}
                <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                    <div style={card}>
                        <div style={h2}>Valuation</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <div>
                                <div style={label}>P/E</div>
                                <div style={value}>
                                    {fmt(item.pe, 1)}{' '}
                                    <span style={{ fontSize: 11, opacity: 0.65 }}>{diffLabel(item.pe, peerStats.pe) ?? ''}</span>
                                </div>
                            </div>
                            <div>
                                <div style={label}>EV/EBITDA</div>
                                <div style={value}>
                                    {fmt(item.evEbitda, 1)}{' '}
                                    <span style={{ fontSize: 11, opacity: 0.65 }}>{diffLabel(item.evEbitda, peerStats.evEbitda) ?? ''}</span>
                                </div>
                            </div>
                            <div>
                                <div style={label}>P/S</div>
                                <div style={value}>
                                    {fmt(item.ps, 1)}{' '}
                                    <span style={{ fontSize: 11, opacity: 0.65 }}>{diffLabel(item.ps, peerStats.ps) ?? ''}</span>
                                </div>
                            </div>
                            <div>
                                <div style={label}>P/B</div>
                                <div style={value}>
                                    {fmt(item.pb, 1)}{' '}
                                    <span style={{ fontSize: 11, opacity: 0.65 }}>{diffLabel(item.pb, peerStats.pb) ?? ''}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={card}>
                        <div style={h2}>Quality & Risk</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <div>
                                <div style={label}>ROE</div>
                                <div style={value}>
                                    {fmtRoe(item.roe)}{' '}
                                    <span style={{ fontSize: 11, opacity: 0.65 }}>{diffLabel(item.roe, peerStats.roe) ?? ''}</span>
                                </div>
                            </div>
                            <div>
                                <div style={label}>Beta</div>
                                <div style={value}>
                                    {fmt(item.beta, 2)}{' '}
                                    <span style={{ fontSize: 11, opacity: 0.65 }}>{diffLabel(item.beta, peerStats.beta) ?? ''}</span>
                                </div>
                            </div>
                            <div>
                                <div style={label}>Debt/Equity</div>
                                <div style={value}>{fmt(item.debtToEquity, 2)}</div>
                            </div>
                            <div>
                                <div style={label}>Current Ratio</div>
                                <div style={value}>{fmt(item.currentRatio, 2)}</div>
                            </div>
                            <div>
                                <div style={label}>Op Margin</div>
                                <div style={value}>
                                    {fmtPct(item.operatingMargin)}{' '}
                                    <span style={{ fontSize: 11, opacity: 0.65 }}>
                                        {diffLabel(item.operatingMargin, peerStats.operatingMargin) ?? ''}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <div style={label}>Net Margin</div>
                                <div style={value}>{fmtPct(item.netMargin)}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Growth */}
                <div style={{ marginTop: 12, ...card }}>
                    <div style={h2}>Growth</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                            <div style={label}>Revenue YoY</div>
                            <div style={value}>
                                {fmtPct(item.revenueGrowthYoY)}{' '}
                                <span style={{ fontSize: 11, opacity: 0.65 }}>
                                    {diffLabel(item.revenueGrowthYoY, peerStats.revenueGrowthYoY) ?? ''}
                                </span>
                            </div>
                        </div>
                        <div>
                            <div style={label}>EPS YoY</div>
                            <div style={value}>
                                {fmtPct(item.epsGrowthYoY)}{' '}
                                <span style={{ fontSize: 11, opacity: 0.65 }}>
                                    {diffLabel(item.epsGrowthYoY, peerStats.epsGrowthYoY) ?? ''}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Memo */}
                <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                    <div style={card}>
                        <div style={h2}>Investment Memo (rule-based)</div>

                        <div style={{ marginTop: 8 }}>
                            <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.9, marginBottom: 6 }}>Tesis</div>
                            <ul style={{ margin: 0, paddingLeft: 18, opacity: 0.85 }}>
                                {memo?.thesis.map((t, i) => (
                                    <li key={i} style={{ fontSize: 12, lineHeight: 1.35, marginBottom: 6 }}>
                                        {t}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div style={{ marginTop: 10 }}>
                            <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.9, marginBottom: 6 }}>Drivers</div>
                            <ul style={{ margin: 0, paddingLeft: 18, opacity: 0.85 }}>
                                {memo?.drivers.map((t, i) => (
                                    <li key={i} style={{ fontSize: 12, lineHeight: 1.35, marginBottom: 6 }}>
                                        {t}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div style={{ marginTop: 10 }}>
                            <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.9, marginBottom: 6 }}>Riesgos</div>
                            <ul style={{ margin: 0, paddingLeft: 18, opacity: 0.85 }}>
                                {memo?.risks.length ? (
                                    memo.risks.map((t, i) => (
                                        <li key={i} style={{ fontSize: 12, lineHeight: 1.35, marginBottom: 6 }}>
                                            {t}
                                        </li>
                                    ))
                                ) : (
                                    <li style={{ fontSize: 12, lineHeight: 1.35, marginBottom: 6 }}>
                                        No se detectaron riesgos cuantitativos fuertes con los datos presentes (igual requiere due diligence).
                                    </li>
                                )}
                            </ul>
                        </div>

                        <div style={{ marginTop: 10 }}>
                            <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.9, marginBottom: 6 }}>Watch</div>
                            <ul style={{ margin: 0, paddingLeft: 18, opacity: 0.85 }}>
                                {memo?.watch.map((t, i) => (
                                    <li key={i} style={{ fontSize: 12, lineHeight: 1.35, marginBottom: 6 }}>
                                        {t}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {memo?.gaps?.length ? (
                            <div style={{ marginTop: 10, fontSize: 11, opacity: 0.70 }}>
                                <b>Data gaps:</b> {memo.gaps.join(', ')}
                            </div>
                        ) : null}
                    </div>

                    {/* Checklist */}
                    <div style={card}>
                        <div style={h2}>Research Checklist</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                            {chk('asof', 'Validar “As of” + fuente + periodicidad (TTM/FY, calendario fiscal).')}
                            {chk('peers', 'Comparar vs peers: P/E, EV/EBITDA, márgenes, crecimiento (y explicar divergencias).')}
                            {chk('earnings', 'Leer último earnings call / guidance (drivers, riesgos, cambios de margen).')}
                            {chk('bs', 'Balance sheet: liquidez, deuda, vencimientos, cobertura de intereses.')}
                            {chk('moat', 'Moat: pricing power, switching costs, share, competencia, regulación.')}
                            {chk('quality', 'Calidad del crecimiento: FCF, capex, recompras/dilución, stock-based comp.')}
                            {chk('catalysts', 'Catalizadores: próximos eventos, releases, ciclo de producto, macro sensibilidad.')}
                            {chk('risk', 'Riesgos: beta alta, apalancamiento, dependencia de ciclo, concentración de ingresos.')}
                        </div>
                    </div>
                </div>

                <div style={{ height: 16 }} />
            </aside>
        </>
    );
}
