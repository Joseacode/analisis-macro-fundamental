export interface MacroIndicators {
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

export interface RegimeResult {
    regime: string;
    score: number;
    confidence: string;
    context: string;
    characteristics: string[];
    marketBehavior: string;
    sectors: {
        overweight: string[];
        underweight: string[];
    };
    portfolioConsequence: string;
}
