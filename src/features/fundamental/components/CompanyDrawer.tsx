// CompanyDrawer.tsx
import { useState, useMemo } from 'react';
import ProjectionTab from '../../../components/ProjectionTab';

// ✅ Types
type Buckets = { value: number; quality: number; growth: number; risk: number };

export type ScoredItem = {
    ticker: string;
    name?: string | null;
    sector?: string | null;
    industry?: string | null;
    subIndustry?: string | null;
    price?: number | null | undefined;
    marketCap?: number | null;
    beta?: number | null;
    pe?: number | null;
    ps?: number | null;
    pb?: number | null;
    evEbitda?: number | null;
    roe?: number | null;
    operatingMargin?: number | null;
    grossMargin?: number | null;
    netMargin?: number | null;
    revenueGrowthYoY?: number | null;
    epsGrowthYoY?: number | null;
    debtToEquity?: number | null;
    currentRatio?: number | null;
    epsTTM?: number | null;
    asOf?: string | null;
    source?: string;
    score: number;
    buckets: Buckets;
};

type PeerStats = {
    pe?: number;
    ps?: number;
    pb?: number;
    evEbitda?: number;
    roe?: number;
    operatingMargin?: number;
    grossMargin?: number;
    netMargin?: number;
    revenueGrowthYoY?: number;
    epsGrowthYoY?: number;
    beta?: number;
    debtToEquity?: number;
    currentRatio?: number;
};

type TabKey = 'overview' | 'valuation' | 'comparables' | 'projection' | 'memo';

interface CompanyDrawerProps {
    open: boolean;
    item: ScoredItem | null;
    peerStats: PeerStats;
    allCompanies: ScoredItem[];
    onClose: () => void;
}

// ✅ Helpers
function isFiniteNumber(v: unknown): v is number {
    return typeof v === 'number' && Number.isFinite(v);
}

const formatters = {
    usd: (v: number | null | undefined) =>
        isFiniteNumber(v) ? `$${v.toFixed(2)}` : '—',

    pct: (v: number | null | undefined) =>
        isFiniteNumber(v) ? `${v.toFixed(1)}%` : '—',

    num: (v: number | null | undefined, decimals = 2) =>
        isFiniteNumber(v) ? v.toFixed(decimals) : '—',

    roe: (v: number | null | undefined) => {
        if (!isFiniteNumber(v)) return '—';
        const asPct = v <= 1 ? v * 100 : v;
        return `${asPct.toFixed(1)}%`;
    },
};

// ✅ Main Component
export function CompanyDrawer({
    open,
    item,
    peerStats,
    allCompanies,
    onClose,
}: CompanyDrawerProps) {
    const [activeTab, setActiveTab] = useState<TabKey>('overview');

    // ✅ Estados para inputs de Graham
    const [growthRate, setGrowthRate] = useState(7);
    const [marginOfSafety, setMarginOfSafety] = useState(25);
    const [currentYield, setCurrentYield] = useState(5.3);

    if (!open || !item) return null;

    // ✅ Cálculos de Graham
    const currentEPS = item.epsTTM ?? 0;
    const currentPrice = item.price ?? 0;

    const grahamOriginal = currentEPS > 0
        ? (currentEPS * (8.5 + 2 * growthRate) * 4.4) / currentYield
        : null;

    const grahamModified = currentEPS > 0
        ? (currentEPS * (Math.sqrt(6) + 2 * growthRate) * 4.4) / currentYield
        : null;

    const acceptableBuyOriginal = grahamOriginal
        ? grahamOriginal * (1 - marginOfSafety / 100)
        : null;

    const acceptableBuyModified = grahamModified
        ? grahamModified * (1 - marginOfSafety / 100)
        : null;

    const getSignal = () => {
        if (!acceptableBuyModified || !currentPrice) return 'UNKNOWN';
        if (currentPrice <= acceptableBuyModified) return 'BUY';
        if (grahamModified && currentPrice <= grahamModified) return 'HOLD';
        return 'OVERVALUED';
    };

    const signal = getSignal();

    // ✅ Styles
    const drawerStyles = {
        overlay: {
            position: 'fixed' as const,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 9999,
            display: open ? 'block' : 'none',
        },
        drawer: {
            position: 'fixed' as const,
            top: 0,
            right: 0,
            bottom: 0,
            width: '70%',
            maxWidth: 750,
            background: '#0f172a',
            overflowY: 'auto' as const,
            zIndex: 10000,
            boxShadow: '-4px 0 20px rgba(0,0,0,0.5)',
        },
        header: {
            position: 'sticky' as const,
            top: 0,
            background: '#1e293b',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            padding: '14px 18px',
            zIndex: 10,
        },
        closeBtn: {
            position: 'absolute' as const,
            top: 14,
            right: 18,
            background: 'rgba(255,68,68,0.15)',
            border: '1px solid rgba(255,68,68,0.3)',
            color: '#fff',
            padding: '6px 12px',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 700,
        },
        tabs: {
            display: 'flex',
            gap: 4,
            marginTop: 12,
        },
        tab: (active: boolean) => ({
            padding: '8px 16px',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 700,
            background: active ? 'rgba(0,217,255,0.15)' : 'rgba(255,255,255,0.05)',
            border: active ? '1px solid rgba(0,217,255,0.3)' : '1px solid rgba(255,255,255,0.1)',
            color: active ? '#00d9ff' : 'rgba(255,255,255,0.7)',
            transition: 'all 0.2s ease',
        }),
        content: {
            padding: 18,
        },
    };

    return (
        <>
            <div style={drawerStyles.overlay} onClick={onClose} />
            <div style={drawerStyles.drawer}>
                {/* Header */}
                <div style={drawerStyles.header}>
                    <button style={drawerStyles.closeBtn} onClick={onClose}>
                        Close
                    </button>

                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>
                        {item.ticker} · {item.name}
                    </h2>
                    <p style={{ margin: '4px 0 0 0', fontSize: 11, opacity: 0.7 }}>
                        Sector: {item.sector ?? '—'} · As of: {item.asOf ?? '—'} · Source: {item.source ?? '—'}
                    </p>

                    {/* Tabs */}
                    <div style={drawerStyles.tabs}>
                        <div
                            style={drawerStyles.tab(activeTab === 'overview')}
                            onClick={() => setActiveTab('overview')}
                        >
                            📊 Overview
                        </div>
                        <div
                            style={drawerStyles.tab(activeTab === 'valuation')}
                            onClick={() => setActiveTab('valuation')}
                        >
                            💰 Valuation
                        </div>
                        <div
                            style={drawerStyles.tab(activeTab === 'comparables')}
                            onClick={() => setActiveTab('comparables')}
                        >
                            ⚖️ Comparables
                        </div>
                        <div
                            style={drawerStyles.tab(activeTab === 'projection')}  // ← CAMBIAR AQUÍ
                            onClick={() => setActiveTab('projection')}            // ← Y AQUÍ
                        >
                            📈 Proyección
                        </div>
                        <div
                            style={drawerStyles.tab(activeTab === 'memo')}
                            onClick={() => setActiveTab('memo')}
                        >
                            📝 Memo
                        </div>
                    </div>

                </div>

                {/* Content */}
                <div style={drawerStyles.content}>
                    {activeTab === 'overview' && (
                        <OverviewTab item={item} peerStats={peerStats} />
                    )}

                    {activeTab === 'valuation' && (
                        <ValuationTab
                            item={item}
                            growthRate={growthRate}
                            setGrowthRate={setGrowthRate}
                            marginOfSafety={marginOfSafety}
                            setMarginOfSafety={setMarginOfSafety}
                            currentYield={currentYield}
                            setCurrentYield={setCurrentYield}
                            grahamOriginal={grahamOriginal}
                            grahamModified={grahamModified}
                            acceptableBuyOriginal={acceptableBuyOriginal}
                            acceptableBuyModified={acceptableBuyModified}
                            signal={signal}
                            currentPrice={currentPrice}
                            currentEPS={currentEPS}
                        />
                    )}

                    {activeTab === 'comparables' && (
                        <ComparablesTab item={item} allCompanies={allCompanies} />
                    )}

                    {activeTab === 'projection' && (
                        <ProjectionTab item={item} peerStats={peerStats} />
                    )}

                    {activeTab === 'memo' && (
                        <MemoTab item={item} peerStats={peerStats} />
                    )}
                </div>
            </div>
        </>
    );
}

// ============================================
// ✅ VALUATION TAB
// ============================================
interface ValuationTabProps {
    item: ScoredItem;
    growthRate: number;
    setGrowthRate: (v: number) => void;
    marginOfSafety: number;
    setMarginOfSafety: (v: number) => void;
    currentYield: number;
    setCurrentYield: (v: number) => void;
    grahamOriginal: number | null;
    grahamModified: number | null;
    acceptableBuyOriginal: number | null;
    acceptableBuyModified: number | null;
    signal: string;
    currentPrice: number;
    currentEPS: number;
}

function ValuationTab({
    growthRate,
    setGrowthRate,
    marginOfSafety,
    setMarginOfSafety,
    currentYield,
    setCurrentYield,
    grahamOriginal,
    grahamModified,
    acceptableBuyOriginal,
    acceptableBuyModified,
    signal,
    currentPrice,
    currentEPS,
}: ValuationTabProps) {
    const cardStyle = {
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    };

    const inputGroupStyle = {
        marginBottom: 12,
    };

    const labelStyle = {
        display: 'block',
        fontSize: 12,
        fontWeight: 700,
        marginBottom: 6,
        opacity: 0.8,
    };

    // ✅ Estilos más sutiles para la señal
    const signalBoxStyle = {
        padding: 16,
        borderRadius: 10,
        textAlign: 'center' as const,
        fontSize: 14,
        fontWeight: 700,
        marginBottom: 16,
        ...(signal === 'BUY' ? {
            background: 'rgba(0,255,136,0.08)',
            border: '1px solid rgba(0,255,136,0.25)',
            color: '#00ff88',
        } : signal === 'HOLD' ? {
            background: 'rgba(255,165,0,0.08)',
            border: '1px solid rgba(255,165,0,0.25)',
            color: '#ffa500',
        } : signal === 'OVERVALUED' ? {
            background: 'rgba(255,68,68,0.08)',
            border: '1px solid rgba(255,68,68,0.25)',
            color: '#ff6b6b',
        } : {
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.5)',
        })
    };

    return (
        <div>
            <h3 style={{ fontSize: 16, fontWeight: 900, marginTop: 0, marginBottom: 16 }}>
                💰 Valor Intrínseco - Fórmula Graham
            </h3>

            {/* Señal principal - más sutil */}
            <div style={signalBoxStyle}>
                {signal === 'BUY' && '🟢 COMPRAR - Precio por debajo del valor intrínseco'}
                {signal === 'HOLD' && '🟡 ESPERAR - Precio justo, considerar mejor entrada'}
                {signal === 'OVERVALUED' && '🔴 SOBREVALORADA - Precio por encima del valor intrínseco'}
                {signal === 'UNKNOWN' && '⚪ DATOS INSUFICIENTES'}
            </div>

            {/* Precio actual */}
            <div style={cardStyle}>
                <h4 style={{ fontSize: 13, fontWeight: 700, marginTop: 0, marginBottom: 10, opacity: 0.8 }}>
                    Precio Actual
                </h4>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#00d9ff' }}>
                    {formatters.usd(currentPrice)}
                </div>
                <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
                    EPS TTM: {formatters.usd(currentEPS)}
                </div>
            </div>

            {/* Inputs editables */}
            <div style={cardStyle}>
                <h4 style={{ fontSize: 13, fontWeight: 700, marginTop: 0, marginBottom: 12, opacity: 0.8 }}>
                    Parámetros (editable)
                </h4>

                <div style={inputGroupStyle}>
                    <label style={labelStyle}>
                        Growth Rate (próximos 5 años): {growthRate}%
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="30"
                        step="0.5"
                        value={growthRate}
                        onChange={(e) => setGrowthRate(Number(e.target.value))}
                        style={{ width: '100%' }}
                    />
                </div>

                <div style={inputGroupStyle}>
                    <label style={labelStyle}>
                        Current Yield (bonos AAA): {currentYield}%
                    </label>
                    <input
                        type="range"
                        min="1"
                        max="10"
                        step="0.1"
                        value={currentYield}
                        onChange={(e) => setCurrentYield(Number(e.target.value))}
                        style={{ width: '100%' }}
                    />
                </div>

                <div style={inputGroupStyle}>
                    <label style={labelStyle}>
                        Margen de Seguridad: {marginOfSafety}%
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="50"
                        step="5"
                        value={marginOfSafety}
                        onChange={(e) => setMarginOfSafety(Number(e.target.value))}
                        style={{ width: '100%' }}
                    />
                </div>
            </div>

            {/* Resultados Graham Original */}
            <div style={cardStyle}>
                <h4 style={{ fontSize: 13, fontWeight: 700, marginTop: 0, marginBottom: 10, opacity: 0.8 }}>
                    📐 Fórmula Graham Original
                </h4>
                <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 12, fontFamily: 'monospace' }}>
                    V* = (EPS × (8.5 + 2g) × 4.4) / Y
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginTop: 12 }}>
                    <div>
                        <div style={{ fontSize: 10, opacity: 0.6 }}>Valor Intrínseco</div>
                        <div style={{ fontSize: 16, fontWeight: 900 }}>{formatters.usd(grahamOriginal)}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 10, opacity: 0.6 }}>Buy Price (−{marginOfSafety}%)</div>
                        <div style={{ fontSize: 16, fontWeight: 900, color: '#00ff88' }}>
                            {formatters.usd(acceptableBuyOriginal)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Resultados Graham Modificada */}
            <div style={cardStyle}>
                <h4 style={{ fontSize: 13, fontWeight: 700, marginTop: 0, marginBottom: 10, opacity: 0.8 }}>
                    📐 Fórmula Graham Modificada ⭐
                </h4>
                <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 12, fontFamily: 'monospace' }}>
                    V* = (EPS × (√6 + 2g) × 4.4) / Y
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginTop: 12 }}>
                    <div>
                        <div style={{ fontSize: 10, opacity: 0.6 }}>Valor Intrínseco</div>
                        <div style={{ fontSize: 16, fontWeight: 900 }}>{formatters.usd(grahamModified)}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 10, opacity: 0.6 }}>Buy Price (−{marginOfSafety}%)</div>
                        <div style={{ fontSize: 16, fontWeight: 900, color: '#00ff88' }}>
                            {formatters.usd(acceptableBuyModified)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Interpretación */}
            <div style={cardStyle}>
                <h4 style={{ fontSize: 13, fontWeight: 700, marginTop: 0, marginBottom: 8, opacity: 0.8 }}>
                    📊 Interpretación
                </h4>
                <div style={{ fontSize: 12, lineHeight: 1.6, opacity: 0.85 }}>
                    {currentPrice < (acceptableBuyModified ?? 0) && acceptableBuyModified && (
                        <>
                            ✅ El precio está <strong>{formatters.num(((acceptableBuyModified - currentPrice) / acceptableBuyModified) * 100, 1)}% por debajo</strong> del precio de compra aceptable.
                        </>
                    )}
                    {currentPrice >= (acceptableBuyModified ?? 0) && currentPrice <= (grahamModified ?? 0) && grahamModified && (
                        <>
                            ⚠️ El precio está entre el valor intrínseco y el precio de compra ideal. Considerar esperar mejor entrada.
                        </>
                    )}
                    {currentPrice > (grahamModified ?? 0) && grahamModified && (
                        <>
                            ⛔ El precio está <strong>{formatters.num(((currentPrice - grahamModified) / grahamModified) * 100, 1)}% por encima</strong> del valor intrínseco calculado.
                        </>
                    )}
                </div>
            </div>

            {/* Notas */}
            <div style={{ fontSize: 10, opacity: 0.5, lineHeight: 1.5, marginTop: 12 }}>
                <strong>Notas:</strong> La fórmula Graham es conservadora y funciona mejor con empresas maduras.
                Growth Rate es el crecimiento anual estimado del EPS. Current Yield es el rendimiento de bonos AAA (~5-6%).
            </div>
        </div>
    );
}

// ============================================
// ✅ OVERVIEW TAB
// ============================================
function OverviewTab({ item, peerStats }: { item: ScoredItem; peerStats: PeerStats }) {
    const cardStyle = {
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    };

    const metricRow = (label: string, value: string | number, vsMedian?: number | null) => {
        const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value;
        const diff = vsMedian != null && isFiniteNumber(vsMedian) && isFiniteNumber(numValue)
            ? ((numValue - vsMedian) / Math.abs(vsMedian)) * 100
            : null;

        return (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
                <div style={{ fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{value}</span>
                    {diff != null && Math.abs(diff) > 0.1 && (
                        <span style={{
                            fontSize: 10,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: diff > 0 ? 'rgba(0,255,136,0.1)' : 'rgba(255,68,68,0.1)',
                            color: diff > 0 ? '#00ff88' : '#ff6b6b',
                            fontWeight: 600
                        }}>
                            {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
                        </span>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div>
            <h3 style={{ fontSize: 16, fontWeight: 900, marginTop: 0, marginBottom: 16 }}>
                📊 Overview
            </h3>

            {/* Score - Colores exactos del dashboard */}
            <div style={cardStyle}>
                <h4 style={{ fontSize: 13, fontWeight: 700, marginTop: 0, marginBottom: 12, opacity: 0.8 }}>
                    Score Total: {Math.round(item.score)}
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {/* Value - Verde oscuro (como en dashboard) */}
                    <div style={{
                        textAlign: 'center',
                        padding: '12px 8px',
                        background: 'rgba(5, 46, 37, 0.6)',
                        border: '1px solid rgba(5, 46, 37, 0.8)',
                        borderRadius: 8
                    }}>
                        <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 4 }}>Value</div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>{Math.round(item.buckets.value)}</div>
                    </div>

                    {/* Quality - Azul oscuro (como en dashboard) */}
                    <div style={{
                        textAlign: 'center',
                        padding: '12px 8px',
                        background: 'rgba(14, 35, 56, 0.6)',
                        border: '1px solid rgba(14, 35, 56, 0.8)',
                        borderRadius: 8
                    }}>
                        <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 4 }}>Quality</div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>{Math.round(item.buckets.quality)}</div>
                    </div>

                    {/* Growth - Marrón oscuro (como en dashboard) */}
                    <div style={{
                        textAlign: 'center',
                        padding: '12px 8px',
                        background: 'rgba(46, 34, 23, 0.6)',
                        border: '1px solid rgba(46, 34, 23, 0.8)',
                        borderRadius: 8
                    }}>
                        <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 4 }}>Growth</div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>{Math.round(item.buckets.growth)}</div>
                    </div>

                    {/* Risk - Púrpura/rojo oscuro (como en dashboard) */}
                    <div style={{
                        textAlign: 'center',
                        padding: '12px 8px',
                        background: 'rgba(44, 22, 33, 0.6)',
                        border: '1px solid rgba(44, 22, 33, 0.8)',
                        borderRadius: 8
                    }}>
                        <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 4 }}>Risk</div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>{Math.round(item.buckets.risk)}</div>
                    </div>
                </div>
            </div>

            {/* Valuation */}
            <div style={cardStyle}>
                <h4 style={{ fontSize: 13, fontWeight: 700, marginTop: 0, marginBottom: 12, opacity: 0.8 }}>
                    Valuation
                </h4>
                {metricRow('P/E', formatters.num(item.pe, 1), peerStats.pe)}
                {metricRow('P/S', formatters.num(item.ps, 1), peerStats.ps)}
                {metricRow('P/B', formatters.num(item.pb, 1), peerStats.pb)}
                {metricRow('EV/EBITDA', formatters.num(item.evEbitda, 1), peerStats.evEbitda)}
            </div>

            {/* Quality & Risk */}
            <div style={cardStyle}>
                <h4 style={{ fontSize: 13, fontWeight: 700, marginTop: 0, marginBottom: 12, opacity: 0.8 }}>
                    Quality & Risk
                </h4>
                {metricRow('ROE', formatters.roe(item.roe), peerStats.roe)}
                {metricRow('Beta', formatters.num(item.beta, 2), peerStats.beta)}
                {metricRow('Debt/Equity', formatters.num(item.debtToEquity, 1), peerStats.debtToEquity)}
                {metricRow('Current Ratio', formatters.num(item.currentRatio, 1), peerStats.currentRatio)}
                {metricRow('Op Margin', formatters.pct(item.operatingMargin), peerStats.operatingMargin)}
                {metricRow('Net Margin', formatters.pct(item.netMargin), peerStats.netMargin)}
            </div>
        </div>
    );
}

// ============================================
// ✅ COMPARABLES TAB - CON DEBUG
// ============================================
// ============================================
// ✅ COMPARABLES TAB - CON SELECTOR DE CRITERIOS
// ============================================
function ComparablesTab({ item, allCompanies }: { item: ScoredItem; allCompanies: ScoredItem[] }) {
    const [selectedComparable, setSelectedComparable] = useState<ScoredItem | null>(null);

    // Estado para criterios de búsqueda (múltiple selección)
    const [searchCriteria, setSearchCriteria] = useState<{
        subIndustry: boolean;
        industry: boolean;
        sector: boolean;
        crossIndustry: boolean;
    }>({
        subIndustry: true,
        industry: true,
        sector: true,
        crossIndustry: false,
    });

    // ✅ Función para normalizar strings (evita problemas de formato)
    function normalizeString(str: string | null | undefined): string {
        if (!str) return '';
        return str
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .trim();
    }

    // 🔍 DEBUG SIMPLE - Esto se ejecuta SIEMPRE que se renderiza
    console.log('=== 🔍 DEBUG INICIO ===');
    console.log(`Empresa: ${item.ticker}`);
    console.log(`Sector: "${item.sector}"`);
    console.log(`Industry: "${item.industry}"`);
    console.log(`SubIndustry: "${item.subIndustry}"`);
    console.log(`Total empresas en dataset: ${allCompanies.length}`);

    // Ver empresas con sector similar
    const sectorMatchesDebug = allCompanies.filter(c =>
        c.sector && normalizeString(c.sector) === normalizeString(item.sector) && c.ticker !== item.ticker
    );
    console.log(`\nEmpresas con sector normalizado similar: ${sectorMatchesDebug.length}`);
    if (sectorMatchesDebug.length > 0) {
        console.log('Ejemplos:', sectorMatchesDebug.slice(0, 5).map(c => c.ticker).join(', '));
    }

    // Ver TODAS las empresas con "commun" en sector
    const commCompanies = allCompanies.filter(c =>
        c.sector?.toLowerCase().includes('commun')
    );
    console.log(`\nEmpresas con "commun" en sector: ${commCompanies.length}`);
    if (commCompanies.length > 0) {
        commCompanies.slice(0, 10).forEach(c => {
            console.log(`  ${c.ticker}: sector="${c.sector}" | industry="${c.industry}"`);
        });
    }

    // Ver sectores únicos en el dataset
    const uniqueSectors = [...new Set(allCompanies.map(c => c.sector).filter(s => s != null))];
    console.log(`\nSectores únicos en dataset (${uniqueSectors.length}):`);
    uniqueSectors.slice(0, 15).forEach(s => console.log(`  - "${s}"`));
    console.log('=== 🔍 DEBUG FIN ===\n');

    // ✅ Función para obtener comparables según criterios seleccionados (CON NORMALIZACIÓN)
    const comparablesByCriteria = useMemo(() => {
        const results: Array<{
            company: ScoredItem;
            matchType: 'subIndustry' | 'industry' | 'sector' | 'crossIndustry';
            similarityScore?: number;
        }> = [];

        const seen = new Set<string>();

        // 1. Sub-Industry (más específico) - CON NORMALIZACIÓN
        if (searchCriteria.subIndustry && item.subIndustry) {
            const normalizedItemSubIndustry = normalizeString(item.subIndustry);

            allCompanies
                .filter((c) =>
                    normalizeString(c.subIndustry) === normalizedItemSubIndustry &&
                    c.ticker !== item.ticker
                )
                .forEach((c) => {
                    if (!seen.has(c.ticker)) {
                        results.push({ company: c, matchType: 'subIndustry' });
                        seen.add(c.ticker);
                    }
                });
        }

        // 2. Industry - CON NORMALIZACIÓN
        if (searchCriteria.industry && item.industry) {
            const normalizedItemIndustry = normalizeString(item.industry);

            allCompanies
                .filter((c) =>
                    normalizeString(c.industry) === normalizedItemIndustry &&
                    c.ticker !== item.ticker
                )
                .forEach((c) => {
                    if (!seen.has(c.ticker)) {
                        results.push({ company: c, matchType: 'industry' });
                        seen.add(c.ticker);
                    }
                });
        }

        // 3. Sector - CON NORMALIZACIÓN
        if (searchCriteria.sector && item.sector) {
            const normalizedItemSector = normalizeString(item.sector);

            allCompanies
                .filter((c) =>
                    normalizeString(c.sector) === normalizedItemSector &&
                    c.ticker !== item.ticker
                )
                .forEach((c) => {
                    if (!seen.has(c.ticker)) {
                        results.push({ company: c, matchType: 'sector' });
                        seen.add(c.ticker);
                    }
                });
        }

        // 4. Cross-Industry (fundamentales similares)
        if (searchCriteria.crossIndustry) {
            const crossMatches = allCompanies
                .filter((c) => c.ticker !== item.ticker && !seen.has(c.ticker))
                .map((c) => {
                    let similarityScore = 0;
                    let validMetrics = 0;

                    // ROE similar
                    if (item.roe != null && c.roe != null) {
                        const roeDiff = Math.abs(item.roe - c.roe);
                        if (roeDiff <= 10) similarityScore += (10 - roeDiff) / 10;
                        validMetrics++;
                    }

                    // Operating Margin similar
                    if (item.operatingMargin != null && c.operatingMargin != null) {
                        const marginDiff = Math.abs(item.operatingMargin - c.operatingMargin);
                        if (marginDiff <= 10) similarityScore += (10 - marginDiff) / 10;
                        validMetrics++;
                    }

                    // P/E similar
                    if (item.pe != null && c.pe != null && item.pe > 0 && c.pe > 0) {
                        const peDiff = Math.abs((item.pe - c.pe) / item.pe) * 100;
                        if (peDiff <= 40) similarityScore += (40 - peDiff) / 40;
                        validMetrics++;
                    }

                    // Debt/Equity similar
                    if (item.debtToEquity != null && c.debtToEquity != null) {
                        if (item.debtToEquity < 50 && c.debtToEquity < 50) similarityScore += 1;
                        else if (Math.abs(item.debtToEquity - c.debtToEquity) <= 30) similarityScore += 0.5;
                        validMetrics++;
                    }

                    // Market Cap similar
                    if (item.marketCap != null && c.marketCap != null) {
                        const itemMcap = parseMarketCap(item.marketCap);
                        const cMcap = parseMarketCap(c.marketCap);
                        if (itemMcap > 0 && cMcap > 0) {
                            const ratio = Math.max(itemMcap, cMcap) / Math.min(itemMcap, cMcap);
                            if (ratio <= 2) similarityScore += 1;
                            else if (ratio <= 5) similarityScore += 0.5;
                            validMetrics++;
                        }
                    }

                    // Revenue Growth similar
                    if (item.revenueGrowthYoY != null && c.revenueGrowthYoY != null) {
                        const growthDiff = Math.abs(item.revenueGrowthYoY - c.revenueGrowthYoY);
                        if (growthDiff <= 15) similarityScore += (15 - growthDiff) / 15;
                        validMetrics++;
                    }

                    return {
                        company: c,
                        matchType: 'crossIndustry' as const,
                        similarityScore: validMetrics > 0 ? (similarityScore / validMetrics) * 100 : 0,
                        validMetrics,
                    };
                })
                .filter((x) => x.similarityScore >= 60 && x.validMetrics >= 4)
                .sort((a, b) => (b.similarityScore ?? 0) - (a.similarityScore ?? 0))
                .slice(0, 15);

            crossMatches.forEach((match) => {
                results.push(match);
                seen.add(match.company.ticker);
            });
        }

        return results;
    }, [allCompanies, item, searchCriteria]);

    function parseMarketCap(mcap: string | number | null): number {
        if (mcap == null) return 0;
        if (typeof mcap === 'number') return mcap;
        const match = mcap.match(/[\d.]+/);
        if (!match) return 0;
        const num = parseFloat(match[0]);
        if (mcap.includes('T')) return num * 1e12;
        if (mcap.includes('B')) return num * 1e9;
        if (mcap.includes('M')) return num * 1e6;
        return num;
    }

    // Stats por tipo - CON NORMALIZACIÓN
    const stats = useMemo(() => {
        const subIndustryCount = item.subIndustry
            ? allCompanies.filter((c) =>
                normalizeString(c.subIndustry) === normalizeString(item.subIndustry) &&
                c.ticker !== item.ticker
            ).length
            : 0;
        const industryCount = item.industry
            ? allCompanies.filter((c) =>
                normalizeString(c.industry) === normalizeString(item.industry) &&
                c.ticker !== item.ticker
            ).length
            : 0;
        const sectorCount = item.sector
            ? allCompanies.filter((c) =>
                normalizeString(c.sector) === normalizeString(item.sector) &&
                c.ticker !== item.ticker
            ).length
            : 0;

        return { subIndustryCount, industryCount, sectorCount };
    }, [allCompanies, item]);

    const cardStyle = {
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    };

    const toggleCriteria = (key: keyof typeof searchCriteria) => {
        setSearchCriteria((prev) => ({ ...prev, [key]: !prev[key] }));
        setSelectedComparable(null);
    };

    return (
        <div>
            <h3 style={{ fontSize: 16, fontWeight: 900, marginTop: 0, marginBottom: 16 }}>
                ⚖️ Comparar empresa vs empresa
            </h3>

            {/* Selector de criterios de búsqueda */}
            <div style={cardStyle}>
                <h4 style={{
                    fontSize: 13,
                    fontWeight: 900,
                    marginTop: 0,
                    marginBottom: 12,
                    opacity: 0.9
                }}>
                    🎯 Criterios de búsqueda
                </h4>
                <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 12, lineHeight: 1.5 }}>
                    Seleccioná qué criterios usar para encontrar empresas comparables.
                    Podés combinar varios criterios para ampliar o reducir los resultados.
                </div>

                {/* Sub-Industry Checkbox */}
                <label
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '10px 12px',
                        marginBottom: 8,
                        borderRadius: 8,
                        background: searchCriteria.subIndustry
                            ? 'rgba(0,255,136,0.1)'
                            : 'rgba(255,255,255,0.02)',
                        border: searchCriteria.subIndustry
                            ? '1px solid rgba(0,255,136,0.3)'
                            : '1px solid rgba(255,255,255,0.08)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                    }}
                    onClick={() => toggleCriteria('subIndustry')}
                >
                    <input
                        type="checkbox"
                        checked={searchCriteria.subIndustry}
                        onChange={() => { }}
                        style={{
                            width: 16,
                            height: 16,
                            marginRight: 10,
                            cursor: 'pointer',
                            accentColor: '#00ff88',
                        }}
                    />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>
                            Sub-Industria GICS
                            <span style={{
                                marginLeft: 8,
                                fontSize: 10,
                                padding: '2px 6px',
                                borderRadius: 4,
                                background: 'rgba(0,255,136,0.2)',
                                color: '#00ff88',
                                fontWeight: 600
                            }}>
                                {stats.subIndustryCount} empresas
                            </span>
                        </div>
                        <div style={{ fontSize: 10, opacity: 0.7 }}>
                            {item.subIndustry || 'N/A'}
                        </div>
                    </div>
                </label>

                {/* Industry Checkbox */}
                <label
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '10px 12px',
                        marginBottom: 8,
                        borderRadius: 8,
                        background: searchCriteria.industry
                            ? 'rgba(0,191,255,0.1)'
                            : 'rgba(255,255,255,0.02)',
                        border: searchCriteria.industry
                            ? '1px solid rgba(0,191,255,0.3)'
                            : '1px solid rgba(255,255,255,0.08)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                    }}
                    onClick={() => toggleCriteria('industry')}
                >
                    <input
                        type="checkbox"
                        checked={searchCriteria.industry}
                        onChange={() => { }}
                        style={{
                            width: 16,
                            height: 16,
                            marginRight: 10,
                            cursor: 'pointer',
                            accentColor: '#00bfff',
                        }}
                    />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>
                            Industria
                            <span style={{
                                marginLeft: 8,
                                fontSize: 10,
                                padding: '2px 6px',
                                borderRadius: 4,
                                background: 'rgba(0,191,255,0.2)',
                                color: '#00bfff',
                                fontWeight: 600
                            }}>
                                {stats.industryCount} empresas
                            </span>
                        </div>
                        <div style={{ fontSize: 10, opacity: 0.7 }}>
                            {item.industry || 'N/A'}
                        </div>
                    </div>
                </label>

                {/* Sector Checkbox */}
                <label
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '10px 12px',
                        marginBottom: 8,
                        borderRadius: 8,
                        background: searchCriteria.sector
                            ? 'rgba(255,165,0,0.1)'
                            : 'rgba(255,255,255,0.02)',
                        border: searchCriteria.sector
                            ? '1px solid rgba(255,165,0,0.3)'
                            : '1px solid rgba(255,255,255,0.08)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                    }}
                    onClick={() => toggleCriteria('sector')}
                >
                    <input
                        type="checkbox"
                        checked={searchCriteria.sector}
                        onChange={() => { }}
                        style={{
                            width: 16,
                            height: 16,
                            marginRight: 10,
                            cursor: 'pointer',
                            accentColor: '#ffa500',
                        }}
                    />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>
                            Sector
                            <span style={{
                                marginLeft: 8,
                                fontSize: 10,
                                padding: '2px 6px',
                                borderRadius: 4,
                                background: 'rgba(255,165,0,0.2)',
                                color: '#ffa500',
                                fontWeight: 600
                            }}>
                                {stats.sectorCount} empresas
                            </span>
                        </div>
                        <div style={{ fontSize: 10, opacity: 0.7 }}>
                            {item.sector || 'N/A'}
                        </div>
                    </div>
                </label>

                {/* Cross-Industry Checkbox */}
                <label
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '10px 12px',
                        borderRadius: 8,
                        background: searchCriteria.crossIndustry
                            ? 'rgba(138,43,226,0.1)'
                            : 'rgba(255,255,255,0.02)',
                        border: searchCriteria.crossIndustry
                            ? '1px solid rgba(138,43,226,0.3)'
                            : '1px solid rgba(255,255,255,0.08)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                    }}
                    onClick={() => toggleCriteria('crossIndustry')}
                >
                    <input
                        type="checkbox"
                        checked={searchCriteria.crossIndustry}
                        onChange={() => { }}
                        style={{
                            width: 16,
                            height: 16,
                            marginRight: 10,
                            cursor: 'pointer',
                            accentColor: '#8a2be2',
                        }}
                    />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>
                            Cross-Industry (fundamentales similares)
                        </div>
                        <div style={{ fontSize: 10, opacity: 0.7 }}>
                            Empresas con ROE, márgenes, P/E y growth similares
                        </div>
                    </div>
                </label>
            </div>

            {/* Resultados */}
            <div style={cardStyle}>
                <h4 style={{
                    fontSize: 13,
                    fontWeight: 900,
                    marginTop: 0,
                    marginBottom: 12,
                    opacity: 0.9
                }}>
                    📊 Resultados: {comparablesByCriteria.length} empresas encontradas
                </h4>

                {comparablesByCriteria.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 20, opacity: 0.7 }}>
                        <div style={{ fontSize: 14, marginBottom: 8 }}>🔍 Sin resultados</div>
                        <div style={{ fontSize: 11 }}>
                            Probá activar más criterios de búsqueda
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Breakdown por tipo */}
                        <div style={{
                            display: 'flex',
                            gap: 8,
                            marginBottom: 16,
                            flexWrap: 'wrap'
                        }}>
                            {['subIndustry', 'industry', 'sector', 'crossIndustry'].map((type) => {
                                const count = comparablesByCriteria.filter((c) => c.matchType === type).length;
                                if (count === 0) return null;

                                const colors = {
                                    subIndustry: { bg: 'rgba(0,255,136,0.1)', text: '#00ff88', label: 'Sub-Industria' },
                                    industry: { bg: 'rgba(0,191,255,0.1)', text: '#00bfff', label: 'Industria' },
                                    sector: { bg: 'rgba(255,165,0,0.1)', text: '#ffa500', label: 'Sector' },
                                    crossIndustry: { bg: 'rgba(138,43,226,0.1)', text: '#c77dff', label: 'Cross-Industry' },
                                };

                                const color = colors[type as keyof typeof colors];

                                return (
                                    <div
                                        key={type}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: 6,
                                            background: color.bg,
                                            fontSize: 11,
                                            fontWeight: 700,
                                            color: color.text,
                                        }}
                                    >
                                        {color.label}: {count}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Selector dropdown */}
                        <select
                            value={selectedComparable?.ticker ?? ''}
                            onChange={(e) => {
                                const comp = comparablesByCriteria.find((c) => c.company.ticker === e.target.value);
                                setSelectedComparable(comp?.company ?? null);
                            }}
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: 10,
                                border: '1px solid rgba(255,255,255,0.2)',
                                background: 'rgba(255,255,255,0.05)',
                                color: '#fff',
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: 'pointer',
                                outline: 'none',
                                WebkitAppearance: 'none',
                                MozAppearance: 'none',
                                appearance: 'none',
                                backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'right 12px center',
                                backgroundSize: '16px',
                                paddingRight: '40px',
                            }}
                        >
                            <option value="" style={{ background: '#1a1f36', color: '#fff', padding: '8px' }}>
                                — Seleccionar empresa para comparar —
                            </option>
                            {comparablesByCriteria.map((c) => {
                                const matchColors = {
                                    subIndustry: '🟢',
                                    industry: '🔵',
                                    sector: '🟠',
                                    crossIndustry: '🟣',
                                };
                                return (
                                    <option
                                        key={c.company.ticker}
                                        value={c.company.ticker}
                                        style={{ background: '#1a1f36', color: '#fff', padding: '8px' }}
                                    >
                                        {matchColors[c.matchType]} {c.company.ticker} · {c.company.name}
                                        {c.similarityScore != null && ` · ${c.similarityScore.toFixed(0)}% match`}
                                    </option>
                                );
                            })}
                        </select>
                    </>
                )}
            </div>

            {/* Tabla de comparación */}
            {selectedComparable && (
                <div style={cardStyle}>
                    <h4 style={{
                        fontSize: 13,
                        fontWeight: 900,
                        marginTop: 0,
                        marginBottom: 16,
                        paddingBottom: 12,
                        borderBottom: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        {item.ticker} vs {selectedComparable.ticker}
                    </h4>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.15)' }}>
                                    <th style={{ textAlign: 'left', padding: '8px 6px', fontWeight: 900, fontSize: 11, opacity: 0.8 }}>
                                        Métrica
                                    </th>
                                    <th style={{ textAlign: 'right', padding: '8px 6px', fontWeight: 900, fontSize: 11, color: '#00d9ff' }}>
                                        {item.ticker}
                                    </th>
                                    <th style={{ textAlign: 'right', padding: '8px 6px', fontWeight: 900, fontSize: 11, color: '#ffa500' }}>
                                        {selectedComparable.ticker}
                                    </th>
                                    <th style={{ textAlign: 'right', padding: '8px 6px', fontWeight: 900, fontSize: 11, opacity: 0.8 }}>
                                        Diferencia
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <ComparisonRow label="Score" val1={item.score} val2={selectedComparable.score} formatter={(v) => v != null ? String(Math.round(v)) : '—'} />
                                <ComparisonRow label="Price" val1={item.price} val2={selectedComparable.price} formatter={formatters.usd} />
                                <ComparisonRow label="Beta" val1={item.beta} val2={selectedComparable.beta} formatter={formatters.num} />
                                <ComparisonRow label="P/E" val1={item.pe} val2={selectedComparable.pe} formatter={formatters.num} />
                                <ComparisonRow label="P/S" val1={item.ps} val2={selectedComparable.ps} formatter={formatters.num} />
                                <ComparisonRow label="P/B" val1={item.pb} val2={selectedComparable.pb} formatter={formatters.num} />
                                <ComparisonRow label="EV/EBITDA" val1={item.evEbitda} val2={selectedComparable.evEbitda} formatter={formatters.num} />
                                <ComparisonRow label="ROE" val1={item.roe} val2={selectedComparable.roe} formatter={formatters.roe} />
                                <ComparisonRow label="Op Margin" val1={item.operatingMargin} val2={selectedComparable.operatingMargin} formatter={formatters.pct} />
                                <ComparisonRow label="Net Margin" val1={item.netMargin} val2={selectedComparable.netMargin} formatter={formatters.pct} />
                                <ComparisonRow label="Rev YoY" val1={item.revenueGrowthYoY} val2={selectedComparable.revenueGrowthYoY} formatter={formatters.pct} />
                                <ComparisonRow label="EPS YoY" val1={item.epsGrowthYoY} val2={selectedComparable.epsGrowthYoY} formatter={formatters.pct} />
                                <ComparisonRow label="Debt/Equity" val1={item.debtToEquity} val2={selectedComparable.debtToEquity} formatter={formatters.num} />
                                <ComparisonRow label="Current Ratio" val1={item.currentRatio} val2={selectedComparable.currentRatio} formatter={formatters.num} />
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}


function ComparisonRow({
    label,
    val1,
    val2,
    formatter
}: {
    label: string;
    val1: number | null | undefined;
    val2: number | null | undefined;
    formatter: (v: number | null | undefined) => string;
}) {
    const diff = isFiniteNumber(val1) && isFiniteNumber(val2)
        ? ((val1 - val2) / Math.abs(val2)) * 100
        : null;

    return (
        <tr style={{
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            transition: 'background 0.2s ease'
        }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
            }}
        >
            <td style={{ padding: '10px 8px', opacity: 0.85, fontWeight: 600 }}>{label}</td>
            <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: '#00d9ff' }}>
                {formatter(val1)}
            </td>
            <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: '#ffa500' }}>
                {formatter(val2)}
            </td>
            <td style={{
                padding: '10px 8px',
                textAlign: 'right',
                fontWeight: 700,
                fontSize: 12,
                color: diff && diff > 0 ? '#00ff88' : diff && diff < 0 ? '#ff4444' : 'rgba(255,255,255,0.5)'
            }}>
                {diff != null ? (
                    <>
                        {diff > 0 ? '↑' : diff < 0 ? '↓' : '='} {Math.abs(diff).toFixed(1)}%
                    </>
                ) : '—'}
            </td>
        </tr>
    );
}

// ============================================
// ✅ MEMO TAB
// ============================================
function MemoTab({ item }: { item: ScoredItem; peerStats: PeerStats }) {
    const cardStyle = {
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    };

    return (
        <div>
            <h3 style={{ fontSize: 18, fontWeight: 900, marginTop: 0 }}>
                📝 Investment Memo
            </h3>

            <div style={cardStyle}>
                <h4 style={{ fontSize: 14, fontWeight: 900, marginTop: 0, marginBottom: 12 }}>
                    Resumen Ejecutivo
                </h4>
                <div style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.9 }}>
                    {item.name} ({item.ticker}) opera en el sector {item.sector ?? 'N/A'}.<br />
                    Score total: {Math.round(item.score)} (Value: {Math.round(item.buckets.value)},
                    Quality: {Math.round(item.buckets.quality)},
                    Growth: {Math.round(item.buckets.growth)},
                    Risk: {Math.round(item.buckets.risk)})
                </div>
            </div>

            <div style={cardStyle}>
                <h4 style={{ fontSize: 14, fontWeight: 900, marginTop: 0, marginBottom: 12 }}>
                    Due Diligence Checklist
                </h4>
                <div style={{ fontSize: 13, lineHeight: 1.8, opacity: 0.9 }}>
                    ☐ Revisar últimos 3 earnings calls<br />
                    ☐ Analizar competidores directos<br />
                    ☐ Verificar tendencias del sector<br />
                    ☐ Evaluar calidad del management<br />
                    ☐ Revisar estructura de deuda<br />
                    ☐ Analizar moat competitivo
                </div>
            </div>
        </div>
    );
}
