export type Unit = "USD"
    | "USD/share"
    | "%"
    | "x"
    | "days"
    | "bps";

export type Category =
    | "Profitability"
    | "Efficiency"
    | "Solvency"
    | "Growth"
    | "Valuation"
    | "Quality";

export interface MetricRow {
    key: string;
    label: string;
    category: Category;
    unit: Unit;
    value_reported: number | null;
    value_adjusted: number | null;
    trend_qoq: number | null;
    trend_yoy: number | null;
}

export interface EarningsBundle {
    ticker: string;
    period: {
        period_id: string;
        quarter_end_date: string;
        filing_date?: string;
        currency: string;
        scaling: "unit" | "thousand" | "million" | "billion";
    };
    reported: any;
    adjusted?: any;
    adjustments?: any[];
    derived?: {
        metricRows: MetricRow[];
        highlights?: string[];
    };
}
