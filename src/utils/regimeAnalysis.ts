import type { MacroIndicators, RegimeResult } from '../types';

export function analyzeRegime(indicators: MacroIndicators): RegimeResult {
    let score = 50;
    const characteristics: string[] = [];

    if (indicators.gdp > 3) {
        score += 15;
        characteristics.push('GDP growth above trend');
    } else if (indicators.gdp < 1) {
        score -= 15;
        characteristics.push('Low GDP growth rate');
    }

    if (indicators.unemployment < 4.5) {
        score += 10;
        characteristics.push('Low unemployment rate');
    } else if (indicators.unemployment > 6) {
        score -= 10;
        characteristics.push('Rising unemployment');
    }

    const yieldCurve = indicators.yield10Y - indicators.yield2Y;
    if (yieldCurve > 0.5) {
        score += 10;
        characteristics.push('Positive yield curve (10Y-2Y)');
    } else if (yieldCurve < 0) {
        score -= 20;
        characteristics.push('Inverted yield curve');
    }

    if (indicators.cpi > 2 && indicators.cpi < 3) {
        score += 5;
        characteristics.push('Inflation within target range');
    } else if (indicators.cpi > 4) {
        score -= 10;
        characteristics.push('Elevated inflation');
    }

    if (indicators.vix && indicators.vix < 15) {
        score += 5;
        characteristics.push('Low market volatility');
    } else if (indicators.vix && indicators.vix > 25) {
        score -= 10;
        characteristics.push('Elevated market volatility');
    }

    let regime: string;
    let confidence: string;
    let context: string;
    let marketBehavior: string;
    let overweight: string[];
    let underweight: string[];
    let portfolioConsequence: string;

    if (score >= 75) {
        regime = 'Expansion';
        confidence = 'HIGH CONFIDENCE';
        context = 'Strong economic growth with positive yield curve and healthy labor market';
        characteristics.push('Rising corporate earnings');
        marketBehavior = 'Cyclical sectors tend to outperform. Risk-on environment favors growth assets.';
        overweight = ['Technology', 'Consumer Discretionary', 'Financials', 'Industrials'];
        underweight = ['Utilities', 'Consumer Staples', 'Bonds'];
        portfolioConsequence = 'Increase equity allocation, reduce defensive positions';
    } else if (score >= 60) {
        regime = 'Mid-Cycle';
        confidence = 'MODERATE CONFIDENCE';
        context = 'Sustained growth with moderating momentum';
        marketBehavior = 'Balanced approach. Quality companies with pricing power perform well.';
        overweight = ['Technology', 'Healthcare', 'Quality Stocks'];
        underweight = ['Energy', 'Materials'];
        portfolioConsequence = 'Maintain diversified portfolio with quality bias';
    } else if (score >= 40) {
        regime = 'Late-Cycle';
        confidence = 'MODERATE CONFIDENCE';
        context = 'Growth slowing, inflation rising, yield curve flattening';
        marketBehavior = 'Defensive positioning becomes important. Volatility increases.';
        overweight = ['Consumer Staples', 'Healthcare', 'Utilities', 'Quality Bonds'];
        underweight = ['Cyclicals', 'Small Caps'];
        portfolioConsequence = 'Reduce risk exposure, increase defensive allocation';
    } else {
        regime = 'Contraction';
        confidence = 'HIGH CONFIDENCE';
        context = 'Economic decline with potential recession signals';
        marketBehavior = 'Risk-off environment. Flight to quality and safe-haven assets.';
        overweight = ['Treasury Bonds', 'Gold', 'Defensive Stocks', 'Cash'];
        underweight = ['Equities', 'High Yield', 'Cyclicals'];
        portfolioConsequence = 'Significant defensive positioning, preserve capital';
    }

    return {
        regime,
        score,
        confidence,
        context,
        characteristics,
        marketBehavior,
        sectors: { overweight, underweight },
        portfolioConsequence
    };
}
