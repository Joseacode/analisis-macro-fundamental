// src/features/fundamental/components/EarningsPanel.tsx
import { useMemo, useState } from "react";
import type { EarningsBundle, MetricRow, Category } from "../../../types/earnings.types";

type Mode = "reported" | "adjusted";

function compactUSD(n: number) {
    const abs = Math.abs(n);
    const sign = n < 0 ? "-" : "";
    if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(2)}T`;
    if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(2)}M`;
    if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(2)}K`;
    return `${sign}${abs.toFixed(0)}`;
}

function fmtNumber(n: number, unit: string) {
    if (!Number.isFinite(n)) return "—";
    if (unit === "%") return `${n.toFixed(2)}%`;
    if (unit === "x") return `${n.toFixed(2)}x`;
    if (unit === "days") return `${n.toFixed(0)}d`;
    if (unit === "bps") return `${n.toFixed(0)} bps`;
    if (unit === "USD") return compactUSD(n);
    if (unit === "USD/share") return `$${n.toFixed(2)}`;
    return n.toString();
}

function catLabel(cat: Category) {
    switch (cat) {
        case "Profitability":
            return "Profitability";
        case "Efficiency":
            return "Efficiency";
        case "Solvency":
            return "Solvency";
        case "Growth":
            return "Growth";
        case "Valuation":
            return "Valuation";
        case "Quality":
            return "Cash Flow & Quality";
        default:
            return String(cat);
    }
}

function MetricTable({
    rows,
    mode,
}: {
    rows: MetricRow[];
    mode: Mode;
}) {
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
                    {rows.map((r) => {
                        const v =
                            mode === "adjusted"
                                ? (r.value_adjusted ?? r.value_reported)
                                : r.value_reported;

                        return (
                            <tr key={r.key} className="hover:bg-white/5">
                                <td className="px-3 py-2 text-white/80">{r.label}</td>
                                <td className="px-3 py-2 text-white/80">
                                    {v == null ? "—" : fmtNumber(v, r.unit)}
                                </td>
                                <td className="px-3 py-2 text-right text-white/70">
                                    {r.trend_qoq == null ? "—" : `${r.trend_qoq.toFixed(2)}%`}
                                </td>
                                <td className="px-3 py-2 text-right text-white/70">
                                    {r.trend_yoy == null ? "—" : `${r.trend_yoy.toFixed(2)}%`}
                                </td>
                            </tr>
                        );
                    })}
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
    const [mode, setMode] = useState<Mode>("reported");

    const rows = data?.derived?.metricRows ?? [];
    const highlights = data?.derived?.highlights ?? [];

    const hasAnyAdjusted = useMemo(() => {
        return rows.some((r) => r.value_adjusted != null);
    }, [rows]);

    // agrupado por categoría
    const byCategory = useMemo(() => {
        const map = new Map<Category, MetricRow[]>();
        for (const r of rows) {
            const arr = map.get(r.category) ?? [];
            arr.push(r);
            map.set(r.category, arr);
        }
        // orden preferido
        const order: Category[] = [
            "Profitability",
            "Quality",
            "Solvency",
            "Growth",
            "Valuation",
            "Efficiency",
        ];
        return order
            .filter((c) => map.has(c))
            .map((c) => ({ category: c, rows: map.get(c)! }));
    }, [rows]);

    // si no hay adjusted, forzar reported
    const effectiveMode: Mode = hasAnyAdjusted ? mode : "reported";

    return (
        <div className="rounded-xl border border-white/10 bg-[#0B1220]/60 shadow-sm">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div>
                    <p className="text-sm font-semibold text-white/90">Fundamental (Earnings)</p>
                    <p className="text-xs text-white/50">
                        {ticker} · {data?.period?.period_id ?? "—"} · {data?.period?.currency ?? "—"}
                        {data?.period?.scaling ? ` · ${data.period.scaling}` : ""}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Toggle reported/adjusted */}
                    <div className="flex overflow-hidden rounded-md border border-white/10 bg-white/5">
                        <button
                            onClick={() => setMode("reported")}
                            className={`px-3 py-1.5 text-xs font-semibold transition ${effectiveMode === "reported"
                                    ? "bg-[#1F2A3A] text-white"
                                    : "text-white/60 hover:text-white"
                                }`}
                        >
                            Reported
                        </button>
                        <button
                            onClick={() => setMode("adjusted")}
                            disabled={!hasAnyAdjusted}
                            className={`px-3 py-1.5 text-xs font-semibold transition ${!hasAnyAdjusted
                                    ? "cursor-not-allowed text-white/30"
                                    : effectiveMode === "adjusted"
                                        ? "bg-[#1F2A3A] text-white"
                                        : "text-white/60 hover:text-white"
                                }`}
                            title={!hasAnyAdjusted ? "No hay métricas ajustadas en este reporte" : ""}
                        >
                            Adjusted
                        </button>
                    </div>

                    <button
                        onClick={onRefresh}
                        className="rounded-md border border-white/10 bg-[#1F2A3A] px-3 py-1.5 text-xs font-medium hover:bg-[#273449]"
                    >
                        Actualizar
                    </button>
                </div>
            </div>

            <div className="p-4">
                {loading ? (
                    <div className="text-xs text-white/60">Cargando earnings…</div>
                ) : error ? (
                    <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-200">
                        <div className="font-semibold">Error cargando earnings ({ticker})</div>
                        <div className="mt-1 opacity-90">{error}</div>
                    </div>
                ) : rows.length === 0 ? (
                    <div className="text-xs text-white/60">
                        No hay datos de earnings para este ticker (mock). Agregalo en{" "}
                        <code className="rounded bg-white/5 px-1 py-0.5">server/data/earningsMock.json</code>.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Highlights */}
                        {highlights.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {highlights.map((h, i) => (
                                    <span
                                        key={`${h}-${i}`}
                                        className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/70"
                                    >
                                        {h}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Secciones por categoría (colapsables) */}
                        {byCategory.map((g) => (
                            <details key={g.category} open className="rounded-lg border border-white/10 bg-white/3">
                                <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/5">
                                    {catLabel(g.category)}{" "}
                                    <span className="ml-2 text-[11px] font-medium text-white/40">
                                        ({g.rows.length})
                                    </span>
                                </summary>
                                <div className="p-3 pt-2">
                                    <MetricTable rows={g.rows} mode={effectiveMode} />
                                </div>
                            </details>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
