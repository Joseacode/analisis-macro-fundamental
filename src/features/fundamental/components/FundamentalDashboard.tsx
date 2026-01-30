// FundamentalDashboard.tsx
import { useEffect, useMemo, useState } from 'react';
import { CompanyDrawer, type ScoredItem } from './CompanyDrawer';
import type { SectorCode } from '../../../types/macro.types';
import { SECTORS } from '../../../utils/constants';

import { fetchSectorFundamentals } from '../../../services/fundamentalService';
import type { FundamentalSnapshot, SectorFundamentalsResponse } from '../../../types/fundamental.types';

import { scoreFundamentals } from '../utils/scoring';
import { SectorComparablesTable } from './SectorComparablesTable';

// ✅ Utilities
function isFiniteNumber(v: unknown): v is number {
    return typeof v === 'number' && Number.isFinite(v);
}

function median(values: Array<number | null | undefined>): number | undefined {
    const arr = values.filter((v): v is number => isFiniteNumber(v)).sort((a, b) => a - b);
    if (!arr.length) return undefined;
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2 === 0 ? (arr[mid - 1] + arr[mid]) / 2 : arr[mid];
}

// ✅ Formatters consolidados
const formatters = {
    number: (v: number | null | undefined, decimals = 2) =>
        isFiniteNumber(v) ? v.toFixed(decimals) : '—',

    int: (v: number | null | undefined) =>
        isFiniteNumber(v) ? String(Math.round(v)) : '—',

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

function sectorList(): SectorCode[] {
    return Object.keys(SECTORS) as SectorCode[];
}

// ✅ Extraído a función pura para mejor testability
function calculatePeerStats(scored: ScoredItem[]) {
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
}

export function FundamentalDashboard() {
    const [sector, setSector] = useState<SectorCode>('XLK');
    const [items, setItems] = useState<FundamentalSnapshot[]>([]);
    const [meta, setMeta] = useState<{ asOf?: string; source?: string }>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<ScoredItem | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [allSectorsData, setAllSectorsData] = useState<FundamentalSnapshot[]>([]);

    // ✅ NUEVO: Estado para búsqueda global
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<FundamentalSnapshot[]>([]);
    const [searching, setSearching] = useState(false);

    // ✅ CORREGIDO: Cargar todos los sectores con fundamentals
    useEffect(() => {
        const loadAllSectors = async () => {
            try {
                const allData: FundamentalSnapshot[] = [];

                for (const s of sectorList()) {
                    const res = await fetchSectorFundamentals(s, { top: 100 });
                    if (res.items && Array.isArray(res.items)) {
                        allData.push(...res.items);
                    }
                }

                setAllSectorsData(allData);
                console.log(`✅ Cargadas ${allData.length} empresas de todos los sectores`);
            } catch (e) {
                console.error('Error cargando todos los sectores:', e);
            }
        };

        void loadAllSectors();
    }, []);

    // ✅ Improved load with better error handling
    const load = async (s: SectorCode) => {
        try {
            setLoading(true);
            setError(null);

            const res: SectorFundamentalsResponse = await fetchSectorFundamentals(s, { top: 100 });

            if (!res.items || !Array.isArray(res.items)) {
                throw new Error('Invalid response format');
            }

            setItems(res.items);
            setMeta({
                asOf: res.asOf ?? undefined,
                source: res.source ?? undefined
            });
            setSelected(null);
            setDrawerOpen(false);
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Unknown error loading sector data';
            console.error('Error loading sector:', msg, e);
            setError(msg);
            setItems([]);
            setMeta({});
            setSelected(null);
            setDrawerOpen(false);
        } finally {
            setLoading(false);
        }
    };

    // ✅ NUEVA: Función de búsqueda global
    const handleSearch = async (query: string) => {
        setSearchQuery(query);

        if (!query.trim() || query.trim().length < 2) {
            setSearchResults([]);
            return;
        }

        try {
            setSearching(true);
            const response = await fetch(`/api/yf/search?q=${encodeURIComponent(query.trim())}`);

            if (!response.ok) {
                throw new Error('Error en búsqueda');
            }

            const data = await response.json();
            setSearchResults(data.items || []);
        } catch (e) {
            console.error('Error searching:', e);
            setSearchResults([]);
        } finally {
            setSearching(false);
        }
    };

    useEffect(() => {
        void load(sector);
    }, [sector]);

    // ✅ Decidir qué items mostrar: resultados de búsqueda o sector actual
    const displayItems = searchQuery.trim().length >= 2 ? searchResults : items;
    const scored = useMemo(() => scoreFundamentals(displayItems), [displayItems]);
    const ranked = useMemo(() => [...scored].sort((a, b) => b.score - a.score), [scored]);
    const top4 = useMemo(() => ranked.slice(0, 4), [ranked]);
    const peerStats = useMemo(() => calculatePeerStats(scored), [scored]);

    // ✅ Scored con TODAS las empresas para el drawer
    const allCompaniesScored = useMemo(
        () => scoreFundamentals(allSectorsData),
        [allSectorsData]
    );

    // ✅ Handlers
    const openDrawer = (it: ScoredItem) => {
        setSelected(it);
        setDrawerOpen(true);
    };

    const closeDrawer = () => {
        setDrawerOpen(false);
    };

    const handleRefresh = () => {
        if (!loading) load(sector);
    };

    // ✅ Styles consolidados
    const styles = {
        container: {
            display: 'flex',
            flexDirection: 'column' as const,
            gap: 12
        },
        card: {
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.10)',
            background: 'rgba(255,255,255,0.03)',
            padding: 12,
        },
        cardClickable: {
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.10)',
            background: 'rgba(255,255,255,0.03)',
            padding: 12,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
        },
        row: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
        },
        btnBase: {
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.90)',
            padding: '8px 10px',
            cursor: 'pointer',
            fontWeight: 800 as const,
            fontSize: 12,
            display: 'inline-flex' as const,
            alignItems: 'center' as const,
            gap: 8,
            transition: 'all 0.2s ease',
        },
        btnRefresh: {
            background: 'rgba(0,255,136,0.10)',
            border: '1px solid rgba(0,255,136,0.22)',
        },
        btnActive: {
            background: 'rgba(0,217,255,0.12)',
            border: '1px solid rgba(0,217,255,0.30)',
        },
        errorBox: {
            marginTop: 12,
            padding: 10,
            borderRadius: 12,
            background: 'rgba(255,68,68,0.12)',
            border: '1px solid rgba(255,68,68,0.30)',
        },
    };

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                        <h2 style={{ fontWeight: 900, fontSize: 16, margin: 0 }}>
                            Fundamental — Sector Drilldown
                        </h2>
                        <p style={{ fontSize: 12, opacity: 0.7, marginTop: 4, margin: 0 }}>
                            Seleccioná sector → compará empresas → click para memo/checklist.
                        </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button
                            style={{ ...styles.btnBase, ...styles.btnRefresh }}
                            onClick={handleRefresh}
                            disabled={loading}
                            aria-label="Refresh data"
                        >
                            {loading ? '⏳ Cargando…' : '🔄 Refresh'}
                        </button>

                        <div style={{ fontSize: 11, opacity: 0.7, textAlign: 'right' }}>
                            <div>
                                <strong>Sector:</strong> {sector} — {SECTORS[sector]}
                            </div>
                            <div>
                                <strong>As of:</strong> {meta.asOf ?? '—'} · <strong>Source:</strong> {meta.source ?? '—'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sector buttons */}
                <div style={{
                    display: 'flex',
                    flexWrap: 'nowrap',
                    gap: 4,
                    marginTop: 12,
                }}>
                    {sectorList().map((code) => {
                        const active = code === sector;
                        return (
                            <button
                                key={code}
                                onClick={() => setSector(code)}
                                disabled={loading}
                                aria-pressed={active}
                                style={{
                                    ...styles.btnBase,
                                    ...(active ? styles.btnActive : {}),
                                    opacity: loading ? 0.5 : 1,
                                    padding: '6px 8px',
                                    fontSize: 10,
                                    whiteSpace: 'nowrap',
                                    flexShrink: 1,
                                    minWidth: 0,
                                    overflow: 'hidden',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'scale(1.05)';
                                    e.currentTarget.style.zIndex = '10';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'scale(1)';
                                    e.currentTarget.style.zIndex = '1';
                                }}
                            >
                                <span style={{ fontWeight: 900 }}>{code}</span>
                                <span style={{
                                    opacity: 0.75,
                                    fontSize: 9,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}>{SECTORS[code]}</span>
                            </button>
                        );
                    })}
                </div>

                {/* ✅ NUEVA: Búsqueda global */}
                <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1, maxWidth: 500 }}>
                        <input
                            type="text"
                            placeholder="🔍 Buscar empresa en todos los sectores (ticker o nombre)..."
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 40px 10px 40px',
                                borderRadius: 10,
                                border: searchQuery ? '1px solid rgba(0,217,255,0.30)' : '1px solid rgba(255,255,255,0.12)',
                                background: searchQuery ? 'rgba(0,217,255,0.08)' : 'rgba(255,255,255,0.04)',
                                color: 'rgba(255,255,255,0.90)',
                                fontSize: 12,
                                outline: 'none',
                                transition: 'all 0.2s ease',
                            }}
                        />
                        <span style={{
                            position: 'absolute',
                            left: 14,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            opacity: searching ? 1 : 0.5,
                            fontSize: 16
                        }}>
                            {searching ? '⏳' : '🔍'}
                        </span>

                        {searchQuery && (
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setSearchResults([]);
                                }}
                                style={{
                                    position: 'absolute',
                                    right: 10,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'rgba(255,68,68,0.15)',
                                    border: '1px solid rgba(255,68,68,0.3)',
                                    borderRadius: 6,
                                    color: 'rgba(255,255,255,0.90)',
                                    fontSize: 11,
                                    cursor: 'pointer',
                                    padding: '4px 8px',
                                }}
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {searchQuery && (
                        <div style={{ fontSize: 11, opacity: 0.7, whiteSpace: 'nowrap' }}>
                            {searching ? 'Buscando...' : `${searchResults.length} resultados`}
                        </div>
                    )}
                </div>

                {/* ✅ Mensaje informativo cuando hay búsqueda activa */}
                {searchQuery && searchResults.length > 0 && (
                    <div style={{
                        marginTop: 10,
                        padding: 8,
                        borderRadius: 8,
                        background: 'rgba(0,217,255,0.08)',
                        border: '1px solid rgba(0,217,255,0.20)',
                        fontSize: 11,
                        opacity: 0.9,
                    }}>
                        🔍 Mostrando resultados de búsqueda en <strong>todos los sectores</strong>.
                        Los sectores de las empresas encontradas aparecen en la tabla.
                    </div>
                )}

                {error && (
                    <div style={styles.errorBox} role="alert">
                        <strong>⚠️ Error:</strong> {error}
                    </div>
                )}
            </div>

            {/* Top performers - Horizontal cards expandidas */}
            <div style={styles.row}>
                {top4.map((it) => (
                    <div
                        key={it.ticker}
                        style={styles.cardClickable}
                        onClick={() => openDrawer(it)}
                        title={`Abrir detalles de ${it.name}`}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                            <div>
                                <div style={{ fontWeight: 900, fontSize: 14 }}>{it.ticker}</div>
                                <div style={{ fontSize: 11, opacity: 0.7, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 900, fontSize: 20 }}>{formatters.int(it.score)}</div>
                                <div style={{ fontSize: 10, opacity: 0.7 }}>score</div>
                            </div>
                        </div>

                        {/* Buckets */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 10, fontSize: 11 }}>
                            <div style={{ background: 'rgba(0,255,136,0.10)', padding: '6px 4px', borderRadius: 8, textAlign: 'center' }}>
                                <div style={{ opacity: 0.7, fontSize: 9 }}>Value</div>
                                <div style={{ fontWeight: 900 }}>{formatters.int(it.buckets.value)}</div>
                            </div>
                            <div style={{ background: 'rgba(0,191,255,0.10)', padding: '6px 4px', borderRadius: 8, textAlign: 'center' }}>
                                <div style={{ opacity: 0.7, fontSize: 9 }}>Quality</div>
                                <div style={{ fontWeight: 900 }}>{formatters.int(it.buckets.quality)}</div>
                            </div>
                            <div style={{ background: 'rgba(255,165,0,0.10)', padding: '6px 4px', borderRadius: 8, textAlign: 'center' }}>
                                <div style={{ opacity: 0.7, fontSize: 9 }}>Growth</div>
                                <div style={{ fontWeight: 900 }}>{formatters.int(it.buckets.growth)}</div>
                            </div>
                            <div style={{ background: 'rgba(255,68,68,0.10)', padding: '6px 4px', borderRadius: 8, textAlign: 'center' }}>
                                <div style={{ opacity: 0.7, fontSize: 9 }}>Risk</div>
                                <div style={{ fontWeight: 900 }}>{formatters.int(it.buckets.risk)}</div>
                            </div>
                        </div>

                        {/* Métricas principales */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: 11, marginBottom: 8 }}>
                            <div>
                                <div style={{ opacity: 0.7, fontSize: 9 }}>Price</div>
                                <div style={{ fontWeight: 900 }}>{formatters.usd(it.price)}</div>
                            </div>
                            <div>
                                <div style={{ opacity: 0.7, fontSize: 9 }}>MktCap</div>
                                <div style={{ fontWeight: 900, fontSize: 10 }}>
                                    {isFiniteNumber(it.marketCap)
                                        ? it.marketCap >= 1e12
                                            ? `$${(it.marketCap / 1e12).toFixed(2)}T`
                                            : `$${(it.marketCap / 1e9).toFixed(2)}B`
                                        : '—'}
                                </div>
                            </div>
                            <div>
                                <div style={{ opacity: 0.7, fontSize: 9 }}>Beta</div>
                                <div style={{ fontWeight: 900 }}>{formatters.number(it.beta, 2)}</div>
                            </div>
                        </div>

                        {/* Valuación */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, fontSize: 11, marginBottom: 8 }}>
                            <div>
                                <div style={{ opacity: 0.7, fontSize: 9 }}>P/E</div>
                                <div style={{ fontWeight: 900 }}>{formatters.number(it.pe, 1)}</div>
                            </div>
                            <div>
                                <div style={{ opacity: 0.7, fontSize: 9 }}>P/S</div>
                                <div style={{ fontWeight: 900 }}>{formatters.number(it.ps, 1)}</div>
                            </div>
                            <div>
                                <div style={{ opacity: 0.7, fontSize: 9 }}>P/B</div>
                                <div style={{ fontWeight: 900 }}>{formatters.number(it.pb, 1)}</div>
                            </div>
                            <div>
                                <div style={{ opacity: 0.7, fontSize: 9 }}>EV/EBITDA</div>
                                <div style={{ fontWeight: 900 }}>{formatters.number(it.evEbitda, 1)}</div>
                            </div>
                        </div>

                        {/* Profitabilidad */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: 11, marginBottom: 8 }}>
                            <div>
                                <div style={{ opacity: 0.7, fontSize: 9 }}>ROE</div>
                                <div style={{ fontWeight: 900 }}>{formatters.roe(it.roe)}</div>
                            </div>
                            <div>
                                <div style={{ opacity: 0.7, fontSize: 9 }}>Op Margin</div>
                                <div style={{ fontWeight: 900 }}>{formatters.pct(it.operatingMargin)}</div>
                            </div>
                            <div>
                                <div style={{ opacity: 0.7, fontSize: 9 }}>Net Margin</div>
                                <div style={{ fontWeight: 900 }}>{formatters.pct(it.netMargin)}</div>
                            </div>
                        </div>

                        {/* Crecimiento */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, fontSize: 11, marginBottom: 8 }}>
                            <div>
                                <div style={{ opacity: 0.7, fontSize: 9 }}>Rev YoY</div>
                                <div style={{ fontWeight: 900 }}>{formatters.pct(it.revenueGrowthYoY)}</div>
                            </div>
                            <div>
                                <div style={{ opacity: 0.7, fontSize: 9 }}>EPS YoY</div>
                                <div style={{ fontWeight: 900 }}>{formatters.pct(it.epsGrowthYoY)}</div>
                            </div>
                        </div>

                        {/* Riesgo financiero */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, fontSize: 11 }}>
                            <div>
                                <div style={{ opacity: 0.7, fontSize: 9 }}>Debt/Equity</div>
                                <div style={{ fontWeight: 900 }}>{formatters.number(it.debtToEquity, 1)}</div>
                            </div>
                            <div>
                                <div style={{ opacity: 0.7, fontSize: 9 }}>Current Ratio</div>
                                <div style={{ fontWeight: 900 }}>{formatters.number(it.currentRatio, 1)}</div>
                            </div>
                        </div>

                        <div style={{ marginTop: 10, fontSize: 10, opacity: 0.65, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 8 }}>
                            As of {it.asOf ?? '—'} · {it.source ?? '—'}
                        </div>
                    </div>
                ))}
            </div>

            {/* Sector Comparables - Full width */}
            <SectorComparablesTable
                items={scored}
                selectedTicker={selected?.ticker}
                onSelect={openDrawer}
                showSectorColumn={!!searchQuery}
            />

            {/* Drawer */}
            <CompanyDrawer
                open={drawerOpen}
                item={selected}
                peerStats={peerStats}
                allCompanies={allCompaniesScored}
                onClose={closeDrawer}
            />
        </div>
    );
}
