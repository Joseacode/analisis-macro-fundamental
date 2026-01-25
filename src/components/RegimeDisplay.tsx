
import type { RegimeResult } from '../types';

interface RegimeDisplayProps {
    result: RegimeResult;
}

export function RegimeDisplay({ result }: RegimeDisplayProps) {
    const getRegimeColor = (regime: string) => {
        switch (regime) {
            case 'Expansion':
                return 'from-green-600 to-emerald-600';
            case 'Mid-Cycle':
                return 'from-blue-600 to-cyan-600';
            case 'Late-Cycle':
                return 'from-yellow-600 to-orange-600';
            case 'Contraction':
                return 'from-red-600 to-rose-600';
            default:
                return 'from-gray-600 to-slate-600';
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 75) return 'text-green-400';
        if (score >= 60) return 'text-blue-400';
        if (score >= 40) return 'text-yellow-400';
        return 'text-red-400';
    };

    return (
        <div className="mt-8 space-y-6">
            {/* Header with regime and score */}
            <div className={`bg-gradient-to-r ${getRegimeColor(result.regime)} rounded-xl p-6 shadow-lg`}>
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-2">{result.regime}</h2>
                        <p className="text-white/90 text-sm font-medium">{result.confidence}</p>
                    </div>
                    <div className="text-right">
                        <div className={`text-5xl font-bold ${getScoreColor(result.score)}`}>
                            {result.score}
                        </div>
                        <p className="text-white/80 text-sm mt-1">Regime Score</p>
                    </div>
                </div>
            </div>

            {/* Context */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
                    📋 Economic Context
                </h3>
                <p className="text-slate-300 leading-relaxed">{result.context}</p>
            </div>

            {/* Characteristics */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    🔍 Key Characteristics
                </h3>
                <ul className="space-y-2">
                    {result.characteristics.map((char, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-slate-300">
                            <span className="text-cyan-500 mt-1">•</span>
                            <span>{char}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Market Behavior */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
                    📊 Expected Market Behavior
                </h3>
                <p className="text-slate-300 leading-relaxed">{result.marketBehavior}</p>
            </div>

            {/* Sector Allocation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Overweight */}
                <div className="bg-green-900/20 rounded-xl p-6 border border-green-700/50">
                    <h3 className="text-xl font-semibold text-green-400 mb-4 flex items-center gap-2">
                        ⬆️ Overweight Sectors
                    </h3>
                    <ul className="space-y-2">
                        {result.sectors.overweight.map((sector, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-green-200">
                                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                {sector}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Underweight */}
                <div className="bg-red-900/20 rounded-xl p-6 border border-red-700/50">
                    <h3 className="text-xl font-semibold text-red-400 mb-4 flex items-center gap-2">
                        ⬇️ Underweight Sectors
                    </h3>
                    <ul className="space-y-2">
                        {result.sectors.underweight.map((sector, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-red-200">
                                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                {sector}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Portfolio Consequence */}
            <div className="bg-cyan-900/20 rounded-xl p-6 border border-cyan-700/50">
                <h3 className="text-xl font-semibold text-cyan-400 mb-3 flex items-center gap-2">
                    💼 Portfolio Consequence
                </h3>
                <p className="text-cyan-100 leading-relaxed font-medium">{result.portfolioConsequence}</p>
            </div>
        </div>
    );
}