// src/features/fundamental/components/SeriesPanel.tsx

import { useEffect, useState } from "react";
import { fetchFundamentalsSeries } from "../../../services/fundamentalService";
import type {
    FundamentalsSeriesResponse,
    SeriesItem,
} from "../../../types/fundamental.types";

interface SeriesPanelProps {
    ticker: string;
    onRetry: () => void;
}

type StatementType = "income" | "balance" | "cashflow" | "computed";

// ✅ Helper: formato compacto USD
function compactUSD(n: number | null): string {
    if (n == null || !Number.isFinite(n)) return "—";
    const abs = Math.abs(n);
    const sign = n < 0 ? "-" : "";
    if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`;
    if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
    if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(2)}K`;
    return `${sign}$${abs.toFixed(0)}`;
}

// ✅ Helper: formato porcentaje
function fmtPct(n: number | null): string {
    if (n == null || !Number.isFinite(n)) return "—";
    return `${n.toFixed(2)}%`;
}

// ✅ Helper: formato número
function fmtNum(n: number | null, decimals = 2): string {
    if (n == null || !Number.isFinite(n)) return "—";
    return n.toFixed(decimals);
}

export function SeriesPanel({ ticker, onRetry }: SeriesPanelProps) {
    const [data, setData] = useState<FundamentalsSeriesResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [limit, setLimit] = useState(8); // Default 8 quarters
    const [statementType, setStatementType] = useState<StatementType>("income");

    useEffect(() => {
        loadData();
    }, [ticker, limit]);

    async function loadData() {
        try {
            setLoading(true);
            setError(null);

            // 🔍 DEBUG: Ver la URL que se está llamando
            const url = `/api/fundamentals/${encodeURIComponent(ticker.trim().toUpperCase())}/series?limit=${limit}`;
            console.log('🔍 [SeriesPanel] Fetching URL:', url);

            // 🔍 DEBUG: Hacer fetch manual para ver la respuesta cruda
            const response = await fetch(url);

            console.log('📡 [SeriesPanel] Response status:', response.status);
            console.log('📡 [SeriesPanel] Response headers:', Object.fromEntries(response.headers.entries()));

            const rawText = await response.text();
            console.log('📄 [SeriesPanel] Raw response (first 500 chars):', rawText.slice(0, 500));

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${rawText.slice(0, 200)}`);
            }

            // Intentar parsear JSON
            let parsedData;
            try {
                parsedData = JSON.parse(rawText);
                console.log('✅ [SeriesPanel] Parsed JSON successfully:', parsedData);
            } catch (parseError: any) {
                console.error('❌ [SeriesPanel] JSON parse error:', parseError);
                console.log('📄 [SeriesPanel] Full raw text:', rawText);
                throw new Error(`Invalid JSON response: ${parseError.message}`);
            }

            setData(parsedData);
        } catch (e: any) {
            console.error('❌ [SeriesPanel] Error loading data:', e);
            setError(String(e?.message ?? e));
            setData(null);
        } finally {
            setLoading(false);
        }
    }


    // ✅ Styles
    const cardStyle = {
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    };

    const btnStyle = (active: boolean) => ({
        padding: "8px 16px",
        borderRadius: 8,
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 700,
        background: active ? "rgba(0,217,255,0.15)" : "rgba(255,255,255,0.05)",
        border: active
            ? "1px solid rgba(0,217,255,0.3)"
            : "1px solid rgba(255,255,255,0.1)",
        color: active ? "#00d9ff" : "rgba(255,255,255,0.7)",
        transition: "all 0.2s ease",
    });

    const tableStyle = {
        width: "100%",
        borderCollapse: "collapse" as const,
        fontSize: 11,
        marginTop: 12,
    };

    const thStyle = {
        borderBottom: "1px solid rgba(255,255,255,0.15)",
        padding: "8px 10px",
        textAlign: "left" as const,
        fontWeight: 700,
        background: "rgba(255,255,255,0.03)",
        position: "sticky" as const,
        left: 0,
        zIndex: 10,
    };

    const tdStyle = {
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        padding: "6px 10px",
        fontFamily: "monospace",
    };

    const tdLabelStyle = {
        ...tdStyle,
        position: "sticky" as const,
        left: 0,
        background: "rgba(15,23,42,0.95)",
        fontWeight: 600,
        zIndex: 5,
    };

    if (loading) {
        return (
            <div style={cardStyle}>
                <div style={{ textAlign: "center", padding: 20 }}>
                    ⏳ Cargando series históricas...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={cardStyle}>
                <div
                    style={{
                        color: "#ff6b6b",
                        background: "rgba(255,68,68,0.1)",
                        padding: 12,
                        borderRadius: 8,
                        marginBottom: 12,
                    }}
                >
                    ⚠️ Error: {error}
                </div>
                <button
                    onClick={onRetry}
                    style={{
                        ...btnStyle(false),
                        background: "rgba(0,255,136,0.10)",
                        border: "1px solid rgba(0,255,136,0.22)",
                    }}
                >
                    🔄 Reintentar
                </button>
            </div>
        );
    }

    if (!data || !data.series || data.series.length === 0) {
        return (
            <div style={cardStyle}>
                <div style={{ textAlign: "center", padding: 20 }}>
                    ℹ️ Sin datos disponibles para {ticker}
                </div>
            </div>
        );
    }

    const series = data.series;

    return (
        <div>
            {/* Header */}
            <div style={cardStyle}>
                <div style={{ marginBottom: 12 }}>
                    <strong style={{ fontSize: 14 }}>
                        📊 Series Fundamentales - {ticker}
                    </strong>
                    <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
                        {data.currency} · {data.scaling} · CIK: {data.cik}
                    </div>
                </div>

                {/* Controles */}
                <div
                    style={{
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                        marginBottom: 12,
                    }}
                >
                    <span style={{ fontSize: 11, opacity: 0.7, alignSelf: "center" }}>
                        Quarters:
                    </span>
                    {[4, 8, 12, 16].map((n) => (
                        <button
                            key={n}
                            onClick={() => setLimit(n)}
                            style={btnStyle(limit === n)}
                        >
                            {n}Q
                        </button>
                    ))}
                </div>

                {/* Tabs de statement type */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                        onClick={() => setStatementType("income")}
                        style={btnStyle(statementType === "income")}
                    >
                        📈 Income
                    </button>
                    <button
                        onClick={() => setStatementType("balance")}
                        style={btnStyle(statementType === "balance")}
                    >
                        🏦 Balance
                    </button>
                    <button
                        onClick={() => setStatementType("cashflow")}
                        style={btnStyle(statementType === "cashflow")}
                    >
                        💵 Cash Flow
                    </button>
                    <button
                        onClick={() => setStatementType("computed")}
                        style={btnStyle(statementType === "computed")}
                    >
                        🧮 Computed Metrics
                    </button>
                </div>
            </div>

            {/* Tabla horizontal scrollable */}
            <div style={{ ...cardStyle, overflowX: "auto" }}>
                {statementType === "income" && (
                    <IncomeTable series={series} styles={{ tableStyle, thStyle, tdStyle, tdLabelStyle }} />
                )}
                {statementType === "balance" && (
                    <BalanceTable series={series} styles={{ tableStyle, thStyle, tdStyle, tdLabelStyle }} />
                )}
                {statementType === "cashflow" && (
                    <CashFlowTable series={series} styles={{ tableStyle, thStyle, tdStyle, tdLabelStyle }} />
                )}
                {statementType === "computed" && (
                    <ComputedTable series={series} styles={{ tableStyle, thStyle, tdStyle, tdLabelStyle }} />
                )}
            </div>
        </div>
    );
}

// ============================================
// ✅ INCOME STATEMENT TABLE
// ============================================
function IncomeTable({
    series,
    styles,
}: {
    series: SeriesItem[];
    styles: any;
}) {
    return (
        <table style={styles.tableStyle}>
            <thead>
                <tr>
                    <th style={styles.thStyle}>Metric</th>
                    {series.map((s) => (
                        <th key={s.period.period_id} style={styles.thStyle}>
                            {s.period.period_id}
                            <div style={{ fontSize: 9, opacity: 0.6 }}>
                                {s.period.quarter_end_date}
                            </div>
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                <MetricRow label="Revenue" data={series} accessor={(s) => s.reported.income.revenue} formatter={compactUSD} styles={styles} />
                <MetricRow label="Cost of Revenue" data={series} accessor={(s) => s.reported.income.cost_of_revenue} formatter={compactUSD} styles={styles} />
                <MetricRow label="Gross Profit" data={series} accessor={(s) => s.reported.income.gross_profit} formatter={compactUSD} styles={styles} />
                <MetricRow label="Operating Expenses" data={series} accessor={(s) => s.reported.income.operating_expenses} formatter={compactUSD} styles={styles} />
                <MetricRow label="Operating Income" data={series} accessor={(s) => s.reported.income.operating_income} formatter={compactUSD} styles={styles} />
                <MetricRow label="Net Income" data={series} accessor={(s) => s.reported.income.net_income} formatter={compactUSD} styles={styles} />
                <MetricRow label="EPS (Diluted)" data={series} accessor={(s) => s.reported.income.eps_diluted} formatter={(n) => n != null ? `$${n.toFixed(2)}` : "—"} styles={styles} />
            </tbody>
        </table>
    );
}

// ============================================
// ✅ BALANCE SHEET TABLE
// ============================================
function BalanceTable({
    series,
    styles,
}: {
    series: SeriesItem[];
    styles: any;
}) {
    return (
        <table style={styles.tableStyle}>
            <thead>
                <tr>
                    <th style={styles.thStyle}>Metric</th>
                    {series.map((s) => (
                        <th key={s.period.period_id} style={styles.thStyle}>
                            {s.period.period_id}
                            <div style={{ fontSize: 9, opacity: 0.6 }}>
                                {s.period.quarter_end_date}
                            </div>
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                <MetricRow label="Total Assets" data={series} accessor={(s) => s.reported.balance.total_assets} formatter={compactUSD} styles={styles} />
                <MetricRow label="Current Assets" data={series} accessor={(s) => s.reported.balance.current_assets} formatter={compactUSD} styles={styles} />
                <MetricRow label="Cash & Equivalents" data={series} accessor={(s) => s.reported.balance.cash_and_equivalents} formatter={compactUSD} styles={styles} />
                <MetricRow label="Total Liabilities" data={series} accessor={(s) => s.reported.balance.total_liabilities} formatter={compactUSD} styles={styles} />
                <MetricRow label="Current Liabilities" data={series} accessor={(s) => s.reported.balance.current_liabilities} formatter={compactUSD} styles={styles} />
                <MetricRow label="Long Term Debt" data={series} accessor={(s) => s.reported.balance.long_term_debt} formatter={compactUSD} styles={styles} />
                <MetricRow label="Total Equity" data={series} accessor={(s) => s.reported.balance.total_equity} formatter={compactUSD} styles={styles} />
            </tbody>
        </table>
    );
}

// ============================================
// ✅ CASH FLOW TABLE
// ============================================
function CashFlowTable({
    series,
    styles,
}: {
    series: SeriesItem[];
    styles: any;
}) {
    return (
        <table style={styles.tableStyle}>
            <thead>
                <tr>
                    <th style={styles.thStyle}>Metric</th>
                    {series.map((s) => (
                        <th key={s.period.period_id} style={styles.thStyle}>
                            {s.period.period_id}
                            <div style={{ fontSize: 9, opacity: 0.6 }}>
                                {s.period.quarter_end_date}
                            </div>
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                <MetricRow label="Operating Cash Flow" data={series} accessor={(s) => s.reported.cashflow.operating_cash_flow} formatter={compactUSD} styles={styles} />
                <MetricRow label="CapEx" data={series} accessor={(s) => s.reported.cashflow.capex} formatter={compactUSD} styles={styles} />
                <MetricRow label="Free Cash Flow" data={series} accessor={(s) => s.reported.cashflow.free_cash_flow} formatter={compactUSD} styles={styles} />
                <MetricRow label="Investing Cash Flow" data={series} accessor={(s) => s.reported.cashflow.investing_cash_flow} formatter={compactUSD} styles={styles} />
                <MetricRow label="Financing Cash Flow" data={series} accessor={(s) => s.reported.cashflow.financing_cash_flow} formatter={compactUSD} styles={styles} />
                <MetricRow label="Dividends Paid" data={series} accessor={(s) => s.reported.cashflow.dividends_paid} formatter={compactUSD} styles={styles} />
                <MetricRow label="Stock Repurchased" data={series} accessor={(s) => s.reported.cashflow.stock_repurchased} formatter={compactUSD} styles={styles} />
            </tbody>
        </table>
    );
}

// ============================================
// ✅ COMPUTED METRICS TABLE
// ============================================
function ComputedTable({
    series,
    styles,
}: {
    series: SeriesItem[];
    styles: any;
}) {
    return (
        <table style={styles.tableStyle}>
            <thead>
                <tr>
                    <th style={styles.thStyle}>Metric</th>
                    {series.map((s) => (
                        <th key={s.period.period_id} style={styles.thStyle}>
                            {s.period.period_id}
                            <div style={{ fontSize: 9, opacity: 0.6 }}>
                                {s.period.quarter_end_date}
                            </div>
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {/* Margins */}
                <tr>
                    <td colSpan={series.length + 1} style={{ ...styles.tdLabelStyle, background: "rgba(0,217,255,0.10)", fontWeight: 900 }}>
                        📊 Margins
                    </td>
                </tr>
                <MetricRow label="Gross Margin" data={series} accessor={(s) => s.computed.margins.gross_margin} formatter={fmtPct} styles={styles} />
                <MetricRow label="Operating Margin" data={series} accessor={(s) => s.computed.margins.operating_margin} formatter={fmtPct} styles={styles} />
                <MetricRow label="Net Margin" data={series} accessor={(s) => s.computed.margins.net_margin} formatter={fmtPct} styles={styles} />
                <MetricRow label="FCF Margin" data={series} accessor={(s) => s.computed.margins.fcf_margin} formatter={fmtPct} styles={styles} />

                {/* Returns */}
                <tr>
                    <td colSpan={series.length + 1} style={{ ...styles.tdLabelStyle, background: "rgba(0,255,136,0.10)", fontWeight: 900 }}>
                        💰 Returns
                    </td>
                </tr>
                <MetricRow label="ROE" data={series} accessor={(s) => s.computed.returns.roe} formatter={fmtPct} styles={styles} />
                <MetricRow label="ROA" data={series} accessor={(s) => s.computed.returns.roa} formatter={fmtPct} styles={styles} />
                <MetricRow label="ROIC" data={series} accessor={(s) => s.computed.returns.roic} formatter={fmtPct} styles={styles} />

                {/* Efficiency */}
                <tr>
                    <td colSpan={series.length + 1} style={{ ...styles.tdLabelStyle, background: "rgba(255,165,0,0.10)", fontWeight: 900 }}>
                        ⚙️ Efficiency
                    </td>
                </tr>
                <MetricRow label="Asset Turnover" data={series} accessor={(s) => s.computed.efficiency.asset_turnover} formatter={(n) => fmtNum(n, 2)} styles={styles} />
                <MetricRow label="Inventory Turnover" data={series} accessor={(s) => s.computed.efficiency.inventory_turnover} formatter={(n) => fmtNum(n, 2)} styles={styles} />

                {/* Liquidity */}
                <tr>
                    <td colSpan={series.length + 1} style={{ ...styles.tdLabelStyle, background: "rgba(138,43,226,0.10)", fontWeight: 900 }}>
                        💧 Liquidity
                    </td>
                </tr>
                <MetricRow label="Current Ratio" data={series} accessor={(s) => s.computed.liquidity.current_ratio} formatter={(n) => fmtNum(n, 2)} styles={styles} />
                <MetricRow label="Quick Ratio" data={series} accessor={(s) => s.computed.liquidity.quick_ratio} formatter={(n) => fmtNum(n, 2)} styles={styles} />

                {/* Leverage */}
                <tr>
                    <td colSpan={series.length + 1} style={{ ...styles.tdLabelStyle, background: "rgba(255,68,68,0.10)", fontWeight: 900 }}>
                        📉 Leverage
                    </td>
                </tr>
                <MetricRow label="Debt to Equity" data={series} accessor={(s) => s.computed.leverage.debt_to_equity} formatter={(n) => fmtNum(n, 2)} styles={styles} />

                {/* Growth QoQ */}
                <tr>
                    <td colSpan={series.length + 1} style={{ ...styles.tdLabelStyle, background: "rgba(0,191,255,0.10)", fontWeight: 900 }}>
                        📈 Growth (QoQ)
                    </td>
                </tr>
                <MetricRow label="Revenue Growth (QoQ)" data={series} accessor={(s) => s.computed.growth.qoq.revenue_growth} formatter={fmtPct} styles={styles} />
                <MetricRow label="Net Income Growth (QoQ)" data={series} accessor={(s) => s.computed.growth.qoq.net_income_growth} formatter={fmtPct} styles={styles} />
                <MetricRow label="Operating Income Growth (QoQ)" data={series} accessor={(s) => s.computed.growth.qoq.operating_income_growth} formatter={fmtPct} styles={styles} />
            </tbody>
        </table>
    );
}

// ============================================
// ✅ GENERIC METRIC ROW
// ============================================
function MetricRow({
    label,
    data,
    accessor,
    formatter,
    styles,
}: {
    label: string;
    data: SeriesItem[];
    accessor: (s: SeriesItem) => number | null | undefined;
    formatter: (n: number | null) => string;
    styles: any;
}) {
    return (
        <tr>
            <td style={styles.tdLabelStyle}>{label}</td>
            {data.map((s) => (
                <td key={s.period.period_id} style={styles.tdStyle}>
                    {formatter(accessor(s) ?? null)}
                </td>
            ))}
        </tr>
    );
}
