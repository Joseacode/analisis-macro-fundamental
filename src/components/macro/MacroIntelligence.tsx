// src/components/macro/MacroIntelligence.tsx

import { MacroInputForm } from '../../features/macro/components/MacroInputForm';
import { RegimeIndicator } from '../../features/macro/components/RegimeIndicator';
import { RegimeContext } from '../../features/macro/components/RegimeContext';
import { RegimeReferenceMatrix } from '../../features/macro/components/RegimeReferenceMatrix';
import { SectorAllocation } from '../../features/sectors/components/SectorAllocation';
import { HistoricalChart } from '../HistoricalChart';
import { FRED_SERIES } from '../../services/dataService';

type FredKey = keyof typeof FRED_SERIES;

interface MacroIntelligenceProps {
    days?: number;
}

export const MacroIntelligence = ({ days = 90 }: MacroIntelligenceProps) => {
    return (
        <div className="mt-8 space-y-6">
            {/* Title */}
            <div className="flex items-center gap-3">
                <span className="text-2xl">🧠</span>
                <h2 className="text-2xl font-bold text-cyan-400">Macro Intelligence</h2>
            </div>

            {/* Top row: Regime + Inputs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RegimeIndicator />
                <MacroInputForm />
            </div>

            {/* Context */}
            <RegimeContext />

            {/* Sector attractiveness */}
            <SectorAllocation />

            {/* Historical charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <HistoricalChart seriesId={'cpi' as FredKey} title="Inflation (CPI)" days={days} color="#22c55e" />
                <HistoricalChart seriesId={'unemployment' as FredKey} title="Unemployment Rate" days={days} color="#f59e0b" />
                <HistoricalChart seriesId={'yield10Y' as FredKey} title="10Y Treasury Yield" days={days} color="#a855f7" />
                <HistoricalChart seriesId={'vix' as FredKey} title="VIX Index" days={days} />
                <HistoricalChart seriesId={'yield2Y' as FredKey} title="2Y Treasury Yield" days={days} color="#38bdf8" />
                <HistoricalChart seriesId={'oilPrice' as FredKey} title="WTI Crude Oil" days={days} color="#94a3b8" />
            </div>

            {/* Reference matrix */}
            <RegimeReferenceMatrix />
        </div>
    );
};
