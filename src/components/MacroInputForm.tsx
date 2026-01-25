import React, { useState } from 'react';
import { fetchLatestMacroData } from '../services/dataService';

interface MacroIndicators {
    gdp: number;
    cpi: number;
    unemployment: number;
    yield10Y: number;
    yield2Y: number;
    fedFundsRate: number;
    vix?: number;
    dollarIndex?: number;
    oilPrice?: number;
}

interface MacroInputFormProps {
    onAnalyze: (data: MacroIndicators) => void;
    onRefresh?: () => void;
}

export function MacroInputForm({ onAnalyze, onRefresh }: MacroInputFormProps) {
    const [indicators, setIndicators] = useState<MacroIndicators>({
        gdp: 2.7,
        cpi: 3.2,
        unemployment: 4.4,
        yield10Y: 4.29,
        yield2Y: 3.59,
        fedFundsRate: 4.25,
        vix: 19.5,
        dollarIndex: 109.2,
        oilPrice: 75.8,
    });

    const [loading, setLoading] = useState(false);

    const handleRefreshData = async () => {
        setLoading(true);
        try {
            const data = await fetchLatestMacroData();

            const newIndicators: MacroIndicators = {
                gdp: data.gdp ?? indicators.gdp,
                cpi: data.cpi ?? indicators.cpi,
                unemployment: data.unemployment ?? indicators.unemployment,
                yield10Y: data.yield10Y ?? indicators.yield10Y,
                yield2Y: data.yield2Y ?? indicators.yield2Y,
                fedFundsRate: data.fedFundsRate ?? indicators.fedFundsRate,
                vix: data.vix ?? indicators.vix,
                dollarIndex: data.dollarIndex ?? indicators.dollarIndex,
                oilPrice: data.oilPrice ?? indicators.oilPrice,
            };

            setIndicators(newIndicators);

            if (onRefresh) {
                onRefresh();
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAnalyze(indicators);
    };

    const handleChange = (field: keyof MacroIndicators, value: string) => {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
            setIndicators(prev => ({ ...prev, [field]: numValue }));
        }
    };

    const InputField = ({
        label,
        value,
        field,
        icon
    }: {
        label: string;
        value: number;
        field: keyof MacroIndicators;
        icon: string;
    }) => (
        <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                <span>{icon}</span>
                {label}
            </label>
            <input
                type="number"
                step="0.01"
                value={value}
                onChange={(e) => handleChange(field, e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
        </div>
    );

    return (
        <div className="space-y-6">

            {/* Header */}
            <div>
                <h2 className="text-lg font-bold text-white mb-1">Economic Inputs</h2>
                <p className="text-xs text-slate-400">Update values and analyze</p>
            </div>

            {/* Refresh Button */}
            <button
                onClick={handleRefreshData}
                disabled={loading}
                className="w-full px-4 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
                {loading ? (
                    <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Loading...
                    </>
                ) : (
                    <>
                        <span>🔄</span>
                        Refresh from FRED
                    </>
                )}
            </button>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Core Indicators */}
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">Core Indicators</h3>
                    <InputField label="GDP Growth (%)" value={indicators.gdp} field="gdp" icon="📈" />
                    <InputField label="CPI Inflation (%)" value={indicators.cpi} field="cpi" icon="💰" />
                    <InputField label="Unemployment (%)" value={indicators.unemployment} field="unemployment" icon="👥" />
                    <InputField label="10Y Yield (%)" value={indicators.yield10Y} field="yield10Y" icon="📊" />
                    <InputField label="2Y Yield (%)" value={indicators.yield2Y} field="yield2Y" icon="📉" />
                    <InputField label="Fed Funds (%)" value={indicators.fedFundsRate} field="fedFundsRate" icon="🏦" />
                </div>

                {/* Market Indicators */}
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Market Indicators</h3>
                    <InputField label="VIX Index" value={indicators.vix || 0} field="vix" icon="⚡" />
                    <InputField label="Dollar Index" value={indicators.dollarIndex || 0} field="dollarIndex" icon="💵" />
                    <InputField label="Oil WTI ($)" value={indicators.oilPrice || 0} field="oilPrice" icon="🛢️" />
                </div>

                {/* Analyze Button */}
                <button
                    type="submit"
                    className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold transition-all shadow-lg"
                >
                    🔍 Analyze Regime
                </button>
            </form>
        </div>
    );
}
