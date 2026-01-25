import { useMemo, useState } from 'react';
import { ExecutiveSnapshot } from '../components/ui/ExecutiveSnapshot';
import { MarketOverview } from '../components/market/MarketOverview';
import { MacroIntelligence } from '../components/macro/MacroIntelligence';
import { useAppSelector } from '../app/hooks';

// Mock data (por ahora)
const marketData = [
    { date: 'Jan', SP500: 4800, NASDAQ: 15200, GDP: 2.1 },
    { date: 'Feb', SP500: 4950, NASDAQ: 15600, GDP: 2.3 },
    { date: 'Mar', SP500: 5100, NASDAQ: 16100, GDP: 2.5 },
    { date: 'Apr', SP500: 5050, NASDAQ: 15900, GDP: 2.2 },
    { date: 'May', SP500: 5200, NASDAQ: 16400, GDP: 2.6 },
    { date: 'Jun', SP500: 5350, NASDAQ: 16800, GDP: 2.8 },
];

const volumeData = [
    { month: 'Jan', volume: 450000 },
    { month: 'Feb', volume: 520000 },
    { month: 'Mar', volume: 480000 },
    { month: 'Apr', volume: 590000 },
    { month: 'May', volume: 610000 },
    { month: 'Jun', volume: 580000 },
];

const TF_TO_DAYS = {
    '1D': 1,
    '1W': 7,
    '1M': 30,
    '3M': 90,
    '1Y': 365,
} as const;

type Timeframe = keyof typeof TF_TO_DAYS;

export const MacroTab = () => {
    const [timeframe, setTimeframe] = useState<Timeframe>('1M');
    const macro = useAppSelector((state) => state.macro);

    const chartDays = useMemo(() => TF_TO_DAYS[timeframe], [timeframe]);

    return (
        <div className="p-6">
            <ExecutiveSnapshot
                gdp={macro.inputs.gdp}
                cpi={macro.inputs.cpi}
                unemployment={macro.inputs.unemployment}
                yield10Y={macro.inputs.yield10Y}


                yield2Y={macro.inputs.yield2Y}
                fedFunds={macro.inputs.fedFundsRate ?? macro.inputs.fedFunds}
                vix={macro.inputs.vix}
                dxy={macro.inputs.dollarIndex ?? macro.inputs.dxy}
                oilWTI={macro.inputs.oilPrice ?? macro.inputs.oilWTI}

                asOf={macro.asOf}
                loading={macro.loading}
            />

            {/* Timeframe Selector */}
            <div className="flex gap-2 mb-6">
                {(Object.keys(TF_TO_DAYS) as Timeframe[]).map((tf) => (
                    <button
                        key={tf}
                        onClick={() => setTimeframe(tf)}
                        className={`px-4 py-2 rounded-lg font-medium transition ${timeframe === tf
                            ? 'bg-cyan-500 text-white'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                    >
                        {tf}
                    </button>
                ))}
            </div>

            <MarketOverview marketData={marketData} volumeData={volumeData} />

            {/* Macro Intelligence (incluye Inputs + charts + matriz) */}
            <MacroIntelligence days={chartDays} />
        </div>
    );
};
