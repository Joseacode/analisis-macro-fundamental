import { useMemo, useState } from 'react';
import { useAppSelector } from '../../../app/hooks';
import type { SectorCode } from '../../../types/macro.types';
import { SECTORS, BIAS_COLORS } from '../../../utils/constants';

type Bias = 'OVERWEIGHT' | 'NEUTRAL' | 'UNDERWEIGHT';

const BUCKET_META: Record<
    Bias,
    { title: string; subtitle: string; pillHint: string }
> = {
    OVERWEIGHT: {
        title: 'Most Attractive',
        subtitle: 'Overweight / tilt long',
        pillHint: 'Overweight',
    },
    NEUTRAL: {
        title: 'Neutral',
        subtitle: 'Benchmark / selective',
        pillHint: 'Neutral',
    },
    UNDERWEIGHT: {
        title: 'Least Attractive',
        subtitle: 'Underweight / avoid',
        pillHint: 'Underweight',
    },
};

const SECTOR_RATIONALE: Record<SectorCode, string> = {
    XLK: 'Duration-sensitive growth; thrives when policy risk fades and capex/investment cycle accelerates (AI, cloud, semis).',
    XLY: 'High beta to jobs + real wages; great in clean expansions, fragile if credit tightens or consumer slows.',
    XLI: 'Cycle + capex + government spend; strong when growth is broad and manufacturing/PMIs stabilize.',
    XLF: 'Benefits from solid growth + healthy credit; watch curve shape, NIMs, and credit losses.',
    XLE: 'Inflation/geo hedge + cash flows; tends to work when commodity pressure or supply risk rises.',
    XLB: 'Late-cycle / reflation hedge; works with infrastructure, commodity momentum, and pricing power.',
    XLV: 'Defensive quality; tends to hold up when growth uncertainty rises or policy gets restrictive.',
    XLP: 'Pure defense; tends to outperform in slowdown/recession, usually lags in risk-on expansions.',
    XLU: 'Rate-sensitive defense; can lag when yields rise, but stabilizes portfolios when volatility spikes.',
    XLRE: 'Real assets + rates; can work if disinflation + falling yields, struggles with tight financial conditions.',
    XLC: 'Blend: growth + cashflows; often “neutral” unless ad cycle/AI infra tailwinds are strong.',
};

function badge(text: string, tone: 'good' | 'warn' | 'bad') {
    const base =
        'inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold border';
    const map = {
        good: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
        warn: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
        bad: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
    } as const;
    return <span className={`${base} ${map[tone]}`}>{text}</span>;
}

export const SectorAllocation = () => {
    const macro = useAppSelector((s) => s.macro);

    const regime = macro.analysis.regime;
    const confidence = macro.analysis.confidence;
    const yieldCurveSpread = macro.analysis.yieldCurveSpread;

    const vix = macro.inputs.vix;
    const creditSpread = macro.inputs.creditSpread; // puede venir vacío hasta que lo conectemos
    const cpi = macro.inputs.cpi;
    const unemployment = macro.inputs.unemployment;

    const [selected, setSelected] = useState<SectorCode | null>(null);

    const buckets = useMemo(() => {
        const byBias: Record<Bias, { sector: SectorCode; name: string }[]> = {
            OVERWEIGHT: [],
            NEUTRAL: [],
            UNDERWEIGHT: [],
        };

        // Fuente de verdad: slice (ya viene coherente con matrix/recommendations)
        const allocs = macro.sectorAllocations ?? [];

        // Fallback si todavía no hay allocations (por ejemplo antes del primer analyze)
        if (!allocs.length) {
            (Object.keys(SECTORS) as SectorCode[]).forEach((code) => {
                byBias.NEUTRAL.push({ sector: code, name: SECTORS[code] });
            });
            return byBias;
        }

        allocs.forEach((a) => {
            const bias = a.bias as Bias;
            byBias[bias].push({ sector: a.sector, name: a.sectorName });
        });

        return byBias;
    }, [macro.sectorAllocations]);

    const riskOverlay = useMemo(() => {
        const flags: { label: string; tone: 'good' | 'warn' | 'bad' }[] = [];

        // Curva
        if (yieldCurveSpread == null) {
            flags.push({ label: 'Curve: n/a', tone: 'warn' });
        } else if (yieldCurveSpread < 0) {
            flags.push({ label: 'Curve inverted', tone: 'bad' });
        } else if (yieldCurveSpread < 0.25) {
            flags.push({ label: 'Curve thin', tone: 'warn' });
        } else {
            flags.push({ label: 'Curve healthy', tone: 'good' });
        }

        // VIX
        if (vix == null) {
            flags.push({ label: 'VIX: n/a', tone: 'warn' });
        } else if (vix >= 22) {
            flags.push({ label: `VIX ${vix.toFixed(1)} (risk-off)`, tone: 'bad' });
        } else if (vix >= 18) {
            flags.push({ label: `VIX ${vix.toFixed(1)} (caution)`, tone: 'warn' });
        } else {
            flags.push({ label: `VIX ${vix.toFixed(1)} (calm)`, tone: 'good' });
        }

        // Credit Spreads (si está cargado)
        if (creditSpread == null) {
            flags.push({ label: 'Spreads: n/a', tone: 'warn' });
        } else if (creditSpread >= 250) {
            flags.push({ label: `Spreads ${Math.round(creditSpread)}bps (stress)`, tone: 'bad' });
        } else if (creditSpread >= 180) {
            flags.push({ label: `Spreads ${Math.round(creditSpread)}bps (watch)`, tone: 'warn' });
        } else {
            flags.push({ label: `Spreads ${Math.round(creditSpread)}bps (benign)`, tone: 'good' });
        }

        // Macro sanity checks (ligeros)
        if (cpi != null && cpi >= 3.5) flags.push({ label: 'Inflation pressure', tone: 'warn' });
        if (unemployment != null && unemployment >= 5.5) flags.push({ label: 'Labor weakening', tone: 'warn' });

        const badCount = flags.filter((f) => f.tone === 'bad').length;
        const warnCount = flags.filter((f) => f.tone === 'warn').length;

        const posture =
            badCount >= 2
                ? 'DEFENSIVE'
                : badCount === 1 || warnCount >= 3
                    ? 'CAUTIOUS'
                    : 'PRO-RISK';

        return { flags, posture };
    }, [yieldCurveSpread, vix, creditSpread, cpi, unemployment]);

    const selectedName = selected ? SECTORS[selected] : null;
    const selectedWhy = selected ? SECTOR_RATIONALE[selected] : null;

    return (
        <div className="rounded-2xl bg-slate-900/40 border border-slate-800 p-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-xl">★</span>
                        <h3 className="text-xl font-bold text-cyan-300">Sector Attractiveness</h3>
                    </div>

                    <p className="mt-1 text-sm text-slate-400">
                        Based on regime: <span className="text-slate-200 font-semibold">{regime ?? '—'}</span>{' '}
                        {confidence ? (
                            <span className="text-slate-500">({confidence} confidence)</span>
                        ) : null}{' '}
                        <span className="text-slate-500">• source: slice allocations (rules-based)</span>
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                        {riskOverlay.flags.map((f, idx) => (
                            <span key={idx}>{badge(f.label, f.tone)}</span>
                        ))}
                        {riskOverlay.posture === 'DEFENSIVE' && badge('Overlay posture: DEFENSIVE', 'bad')}
                        {riskOverlay.posture === 'CAUTIOUS' && badge('Overlay posture: CAUTIOUS', 'warn')}
                        {riskOverlay.posture === 'PRO-RISK' && badge('Overlay posture: PRO-RISK', 'good')}
                    </div>
                </div>

                <div className="text-right hidden md:block">
                    <div className="text-xs text-slate-500">Click a sector pill to open a checklist</div>
                    <div className="text-xs text-slate-600 mt-1">
                        (rules first → confirm with RS + fundamentals)
                    </div>
                </div>
            </div>

            {/* 3 columns */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
                {(Object.keys(BUCKET_META) as Bias[]).map((bias) => {
                    const meta = BUCKET_META[bias];
                    const list = buckets[bias] ?? [];

                    return (
                        <div
                            key={bias}
                            className="rounded-xl border border-slate-800 bg-slate-950/30 p-4"
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <h4 className="font-semibold text-slate-100">{meta.title}</h4>
                                    <p className="text-xs text-slate-500 mt-0.5">{meta.subtitle}</p>
                                </div>
                                <span
                                    className="text-[11px] font-bold px-2 py-1 rounded-full border"
                                    style={{
                                        borderColor: BIAS_COLORS[bias],
                                        color: BIAS_COLORS[bias],
                                        backgroundColor: `${BIAS_COLORS[bias]}12`,
                                    }}
                                >
                                    {meta.pillHint}
                                </span>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                                {list.map((s) => {
                                    const active = selected === s.sector;
                                    return (
                                        <button
                                            key={s.sector}
                                            onClick={() => setSelected(active ? null : s.sector)}
                                            className={`group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition
                        ${active
                                                    ? 'border-cyan-400/60 bg-cyan-500/10 text-cyan-200'
                                                    : 'border-slate-700 bg-slate-900/30 text-slate-200 hover:border-slate-500'
                                                }`}
                                            title="Open sector checklist"
                                        >
                                            <span
                                                className="h-2 w-2 rounded-full"
                                                style={{ backgroundColor: BIAS_COLORS[bias] }}
                                            />
                                            <span className="text-slate-100">{s.sector}</span>
                                            <span className="text-slate-400 group-hover:text-slate-300">
                                                • {s.name}
                                            </span>
                                        </button>
                                    );
                                })}
                                {!list.length && (
                                    <span className="text-sm text-slate-500">—</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Detail panel */}
            <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/35 p-4">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div>
                        <div className="text-sm font-semibold text-slate-100">
                            {selected ? (
                                <>
                                    {selected} <span className="text-slate-500">•</span>{' '}
                                    <span className="text-slate-300">{selectedName}</span>
                                </>
                            ) : (
                                <>Select a sector to open a decision checklist</>
                            )}
                        </div>

                        <p className="mt-1 text-sm text-slate-400">
                            {selectedWhy ? selectedWhy : 'This is where we translate the macro regime into actionable research steps.'}
                        </p>
                    </div>

                    <div className="text-xs text-slate-500 lg:text-right">
                        <div>Decision guardrails:</div>
                        <div className="mt-1">1) Regime → 2) Risk overlay → 3) Relative strength → 4) Fundamentals → 5) Timing</div>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-3 text-sm">
                    <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-3">
                        <div className="font-semibold text-slate-200">Relative Strength</div>
                        <ul className="mt-2 space-y-1 text-slate-400 list-disc list-inside">
                            <li>XL? / SPY ratio trending up (weekly + daily)</li>
                            <li>Higher highs + higher lows vs benchmark</li>
                            <li>Confirm with breadth (advance/decline inside sector)</li>
                        </ul>
                    </div>

                    <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-3">
                        <div className="font-semibold text-slate-200">Fundamentals</div>
                        <ul className="mt-2 space-y-1 text-slate-400 list-disc list-inside">
                            <li>Earnings revisions (up/down) and guidance tone</li>
                            <li>Valuation vs history (P/E, EV/EBITDA) + growth</li>
                            <li>Balance sheet sensitivity (rates/credit)</li>
                        </ul>
                    </div>

                    <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-3">
                        <div className="font-semibold text-slate-200">Macro Fit</div>
                        <ul className="mt-2 space-y-1 text-slate-400 list-disc list-inside">
                            <li>Is this sector a winner in this regime historically?</li>
                            <li>Overlay posture: {riskOverlay.posture}</li>
                            <li>If overlay turns DEFENSIVE, rotate into XLP/XLV/XLU</li>
                        </ul>
                    </div>
                </div>

                <div className="mt-3 text-xs text-slate-500">
                    Note: This module is rules-based and intended to guide research priorities, not to be followed blindly.
                </div>
            </div>
        </div>
    );
};
