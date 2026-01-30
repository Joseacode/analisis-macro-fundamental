// src/features/fundamental/components/EarningsPanel.tsx
import type { EarningsBundle, MetricRow } from "../../../types/earnings.types";

function fmtNumber(n: number, unit: string) {
    if (!Number.isFinite(n)) return "—";
    if (unit === "%") return `${n.toFixed(2)}%`;
    if (unit === "x") return `${n.toFixed(2)}x`;
    if (unit === "USD") return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return n.toString();
}

function MetricTable({ rows }: { rows: MetricRow[] }) {
    return (
        <div className="overflow-hidden rounded-lg border border-white/10">
            <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-white/60">
                    <tr>
                        <th className="px-3 py-2">Métrica</th>
                        <th className="px-3 py-2">Valor</th>
                        <th className="px-3 py-2 text-right">QoQ</th>
                        <th className="px-3 py-2 text-right">YoY</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                    {rows.map((r) => (
                        <tr key={r.key} className="hover:bg-white/5">
                            <td className="px-3 py-2 text-white/80">{r.label}</td>
                            <td className="px-3 py-2 text-white/80">
                                {r.value_reported == null ? "—" : fmtNumber(r.value_reported, r.unit)}
                            </td>
                            <td className="px-3 py-2 text-right text-white/70">
                                {r.trend_qoq == null ? "—" : `${r.trend_qoq.toFixed(2)}%`}
                            </td>
                            <td className="px-3 py-2 text-right text-white/70">
                                {r.trend_yoy == null ? "—" : `${r.trend_yoy.toFixed(2)}%`}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function EarningsPanel({
    ticker,
    data,
    loading,
    error,
    onRefresh,
}: {
    ticker: string;
    data: EarningsBundle | null;
    loading: boolean;
    error: string | null;
    onRefresh: () => void;
}) {
    const rows = data?.derived?.metricRows ?? [];

    return (
        <div className="rounded-xl border border-white/10 bg-[#0B1220]/60 shadow-sm">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div>
                    <p className="text-sm font-semibold text-white/90">Fundamental (Earnings)</p>
                    <p className="text-xs text-white/50">
                        {ticker} · {data?.period?.period_id ?? "—"} · {data?.period?.currency ?? "—"}
                    </p>
                </div>

                <button
                    onClick={onRefresh}
                    className="rounded-md border border-white/10 bg-[#1F2A3A] px-3 py-1.5 text-xs font-medium hover:bg-[#273449]"
                >
                    Actualizar
                </button>
            </div>

            <div className="p-4">
                {loading ? (
                    <div className="text-xs text-white/60">Cargando earnings…</div>
                ) : error ? (
                    <div className="text-xs text-rose-300">
                        Error: {error}
                    </div>
                ) : rows.length === 0 ? (
                    <div className="text-xs text-white/60">
                        No hay datos de earnings para este ticker (mock). Agregalo en <code>server/data/earningsMock.json</code>.
                    </div>
                ) : (
                    <MetricTable rows={rows} />
                )}
            </div>
        </div>
    );
}
