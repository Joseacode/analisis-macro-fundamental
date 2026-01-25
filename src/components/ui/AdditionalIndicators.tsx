import { Activity, DollarSign, TrendingUp } from 'lucide-react';

interface AdditionalIndicatorsProps {
    yield2Y?: number | null;
    fedFundsRate?: number | null;
    vix?: number | null;
    dollarIndex?: number | null;
    oilPrice?: number | null;
    loading?: boolean;
}

const fmt = (v: number | null | undefined, d = 2) =>
    typeof v === 'number' && Number.isFinite(v) ? v.toFixed(d) : '—';

export const AdditionalIndicators = ({
    yield2Y,
    fedFundsRate,
    vix,
    dollarIndex,
    oilPrice,
    loading
}: AdditionalIndicatorsProps) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-slate-400 font-medium">2Y Yield</div>
                    <TrendingUp className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-xl font-bold text-white">
                    {loading ? '—' : `${fmt(yield2Y, 2)}%`}
                </div>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-slate-400 font-medium">Fed Funds</div>
                    <Activity className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-xl font-bold text-white">
                    {loading ? '—' : `${fmt(fedFundsRate, 2)}%`}
                </div>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-slate-400 font-medium">VIX</div>
                    <Activity className="w-4 h-4 text-orange-400" />
                </div>
                <div className="text-xl font-bold text-white">
                    {loading ? '—' : fmt(vix, 1)}
                </div>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-slate-400 font-medium">Dollar Index</div>
                    <DollarSign className="w-4 h-4 text-green-400" />
                </div>
                <div className="text-xl font-bold text-white">
                    {loading ? '—' : fmt(dollarIndex, 1)}
                </div>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-slate-400 font-medium">Oil WTI</div>
                    <DollarSign className="w-4 h-4 text-yellow-400" />
                </div>
                <div className="text-xl font-bold text-white">
                    {loading ? '—' : `$${fmt(oilPrice, 2)}`}
                </div>
            </div>
        </div>
    );
};
