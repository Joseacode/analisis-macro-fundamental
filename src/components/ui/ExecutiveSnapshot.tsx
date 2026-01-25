// src/components/ui/ExecutiveSnapshot.tsx
import {
    TrendingUp,
    DollarSign,
    Users,
    Activity,
    Landmark,
    ShieldAlert,
    BarChart3,
    Droplets,
} from 'lucide-react';

interface ExecutiveSnapshotProps {
    // Top row
    gdp?: number | null;
    cpi?: number | null;
    unemployment?: number | null;
    yield10Y?: number | null;

    // Second row (mini cards)
    yield2Y?: number | null;
    fedFunds?: number | null;
    vix?: number | null;
    dxy?: number | null;
    oilWTI?: number | null;

    loading?: boolean;

    // ✅ As-of por indicador (ej: { gdp:"2026-01-24", cpi:"2025-12-..." ... })
    asOf?: Record<string, string>;
}

const fmt = (v: number | null | undefined, d = 2) =>
    typeof v === 'number' && Number.isFinite(v) ? v.toFixed(d) : '—';

const AsOf = ({ date }: { date?: string }) =>
    date ? <div className="text-[11px] text-slate-500 mt-1">As of {date}</div> : null;

function BigCard({
    title,
    value,
    subtitle,
    icon,
    asOf,
    loading,
}: {
    title: string;
    value: string;
    subtitle: string;
    icon: React.ReactNode;
    asOf?: string;
    loading?: boolean;
}) {
    return (
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-200">{title}</h3>
                <div className="opacity-90">{icon}</div>
            </div>

            <div className="text-4xl font-bold text-white">
                {loading ? '—' : value}
            </div>

            <div className="mt-2 text-slate-400">{subtitle}</div>
            <AsOf date={asOf} />
        </div>
    );
}

function MiniCard({
    title,
    value,
    icon,
    asOf,
    loading,
}: {
    title: string;
    value: string;
    icon: React.ReactNode;
    asOf?: string;
    loading?: boolean;
}) {
    return (
        <div className="bg-slate-800/40 rounded-xl px-4 py-3 border border-slate-700">
            <div className="flex items-center justify-between">
                <div className="text-[11px] tracking-wide text-slate-400 uppercase">{title}</div>
                <div className="opacity-80">{icon}</div>
            </div>
            <div className="mt-1 text-lg font-semibold text-white">
                {loading ? '—' : value}
            </div>
            <AsOf date={asOf} />
        </div>
    );
}

export function ExecutiveSnapshot({
    gdp,
    cpi,
    unemployment,
    yield10Y,
    yield2Y,
    fedFunds,
    vix,
    dxy,
    oilWTI,
    loading,
    asOf,
}: ExecutiveSnapshotProps) {
    return (
        <div className="space-y-4 mb-6">
            {/* Top row (4 big cards) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <BigCard
                    title="GDP Growth"
                    value={`${fmt(gdp, 1)}%`}
                    subtitle="Real economy"
                    icon={<TrendingUp className="w-6 h-6 text-cyan-400" />}
                    asOf={asOf?.gdp}
                    loading={loading}
                />
                <BigCard
                    title="Inflation (CPI)"
                    value={`${fmt(cpi, 2)}%`}
                    subtitle="YoY"
                    icon={<DollarSign className="w-6 h-6 text-green-400" />}
                    asOf={asOf?.cpi}
                    loading={loading}
                />
                <BigCard
                    title="Unemployment"
                    value={`${fmt(unemployment, 1)}%`}
                    subtitle="Labor market"
                    icon={<Users className="w-6 h-6 text-orange-400" />}
                    asOf={asOf?.unemployment}
                    loading={loading}
                />
                <BigCard
                    title="10Y Yield"
                    value={`${fmt(yield10Y, 2)}%`}
                    subtitle="Rates"
                    icon={<Activity className="w-6 h-6 text-purple-400" />}
                    asOf={asOf?.yield10Y}
                    loading={loading}
                />
            </div>

            {/* Second row (mini cards) */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <MiniCard
                    title="2Y Yield"
                    value={`${fmt(yield2Y, 2)}%`}
                    icon={<Activity className="w-4 h-4 text-slate-300" />}
                    asOf={asOf?.yield2Y}
                    loading={loading}
                />
                <MiniCard
                    title="Fed Funds"
                    value={`${fmt(fedFunds, 2)}%`}
                    icon={<Landmark className="w-4 h-4 text-slate-300" />}
                    asOf={asOf?.fedFunds}
                    loading={loading}
                />
                <MiniCard
                    title="VIX"
                    value={`${fmt(vix, 2)}`}
                    icon={<ShieldAlert className="w-4 h-4 text-slate-300" />}
                    asOf={asOf?.vix}
                    loading={loading}
                />
                <MiniCard
                    title="DXY"
                    value={`${fmt(dxy, 2)}`}
                    icon={<BarChart3 className="w-4 h-4 text-slate-300" />}
                    asOf={asOf?.dollarIndex ?? asOf?.dxy}
                    loading={loading}
                />
                <MiniCard
                    title="Oil (WTI)"
                    value={`$${fmt(oilWTI, 2)}`}
                    icon={<Droplets className="w-4 h-4 text-slate-300" />}
                    asOf={asOf?.oilPrice ?? asOf?.oilWTI}
                    loading={loading}
                />
            </div>
        </div>
    );
}
