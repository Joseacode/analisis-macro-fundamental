// src/features/macro/components/MacroInputForm.tsx
import { useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { fetchMacroData, calculateRegime, clearAllData, updateInput } from '../macroSlice';
import { RefreshCw, Play, Trash2 } from 'lucide-react';

type InputKey =
    | 'gdp'
    | 'cpi'
    | 'unemployment'
    | 'yield10Y'
    | 'yield2Y'
    | 'fedFunds'
    | 'vix'
    | 'dxy'
    | 'oilWTI'
    | 'creditSpread';

function fmtUpdated(ts?: string | null) {
    if (!ts) return '—';
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return ts;
    return d.toLocaleString();
}

export function MacroInputForm() {
    const dispatch = useAppDispatch();
    const macro = useAppSelector((s) => s.macro);

    const updatedAt = useMemo(() => {
        return macro.lastUpdated ?? macro.analysis.lastUpdated ?? null;
    }, [macro.lastUpdated, macro.analysis.lastUpdated]);

    const onNumChange = (key: InputKey, raw: string) => {
        const v = raw.trim() === '' ? null : Number(raw);
        dispatch(updateInput({ key: key as any, value: Number.isFinite(v as number) ? (v as number) : null }));
    };

    const doRefresh = async () => {
        await dispatch(fetchMacroData() as any);
        // fetchMacroData ya corre calculateRegime, pero no molesta si querés forzar:
        // dispatch(calculateRegime());
    };

    const doAnalyze = () => {
        dispatch(calculateRegime());
    };

    const doClear = () => {
        dispatch(clearAllData());
    };

    const disabled = macro.loading;

    return (
        <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">
                        <span className="text-sm">📊</span>
                    </div>
                    <div>
                        <div className="text-white font-semibold leading-tight">Macro Economic Inputs</div>
                        <div className="text-xs text-slate-400">
                            Updated: {fmtUpdated(updatedAt)}
                            {macro.error ? <span className="ml-2 text-amber-400">• {macro.error}</span> : null}
                        </div>
                    </div>
                </div>

                {/* Actions (en este orden) */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={doRefresh}
                        disabled={disabled}
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border
              ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-slate-800'}
              bg-slate-900 border-slate-700 text-emerald-300`}
                        title="Fetch latest data"
                    >
                        <RefreshCw className={`w-4 h-4 ${disabled ? 'animate-spin' : ''}`} />
                        REFRESH DATA
                    </button>

                    <button
                        onClick={doAnalyze}
                        disabled={disabled}
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold
              ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:brightness-110'}
              bg-cyan-500 text-white`}
                        title="Recalculate regime"
                    >
                        <Play className="w-4 h-4" />
                        ANALYZE
                    </button>

                    <button
                        onClick={doClear}
                        disabled={disabled}
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold
              ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-slate-800'}
              bg-transparent border border-slate-700 text-red-400`}
                        title="Clear all inputs"
                    >
                        <Trash2 className="w-4 h-4" />
                        CLEAR
                    </button>
                </div>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* CORE */}
                <div className="md:col-span-3">
                    <div className="text-xs font-bold text-slate-400 mb-2">CORE INDICATORS</div>
                </div>

                <Input
                    label="GDP Growth (%)"
                    value={macro.inputs.gdp}
                    onChange={(v) => onNumChange('gdp', v)}
                />
                <Input
                    label="CPI Inflation (%)"
                    value={macro.inputs.cpi}
                    onChange={(v) => onNumChange('cpi', v)}
                />
                <Input
                    label="Unemployment (%)"
                    value={macro.inputs.unemployment}
                    onChange={(v) => onNumChange('unemployment', v)}
                />
                <Input
                    label="10Y Yield (%)"
                    value={macro.inputs.yield10Y}
                    onChange={(v) => onNumChange('yield10Y', v)}
                />
                <Input
                    label="2Y Yield (%)"
                    value={macro.inputs.yield2Y}
                    onChange={(v) => onNumChange('yield2Y', v)}
                />

                {/* OPTIONAL */}
                <div className="md:col-span-3 mt-2">
                    <div className="text-xs font-bold text-slate-400 mb-2">ADDITIONAL INDICATORS (OPTIONAL)</div>
                </div>

                <Input
                    label="Fed Funds (%)"
                    value={macro.inputs.fedFunds}
                    onChange={(v) => onNumChange('fedFunds', v)}
                />
                <Input
                    label="VIX Index"
                    value={macro.inputs.vix}
                    onChange={(v) => onNumChange('vix', v)}
                />
                <Input
                    label="DXY"
                    value={macro.inputs.dxy}
                    onChange={(v) => onNumChange('dxy', v)}
                />
                <Input
                    label="Oil (WTI)"
                    value={macro.inputs.oilWTI}
                    onChange={(v) => onNumChange('oilWTI', v)}
                />
                <Input
                    label="Credit Spread (bps)"
                    value={macro.inputs.creditSpread}
                    onChange={(v) => onNumChange('creditSpread', v)}
                />
            </div>
        </div>
    );
}

function Input({
    label,
    value,
    onChange,
}: {
    label: string;
    value: number | null;
    onChange: (v: string) => void;
}) {
    return (
        <label className="block">
            <div className="text-xs text-slate-400 mb-1">{label}</div>
            <input
                type="number"
                step="0.01"
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2 text-slate-100
                   placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                placeholder="—"
            />
        </label>
    );
}
