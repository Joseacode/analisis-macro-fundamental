export const SECTOR_EXPLANATIONS: Record<string, string> = {
    XLK: 'High growth sensitivity, benefits from capex expansion and innovation cycles',
    XLY: 'Consumer spending increases with strong employment and rising wages',
    XLI: 'Industrial capex rises during economic expansion phases',
    XLF: 'Banks benefit from steepening yield curve and loan growth',
    XLE: 'Energy demand correlates with economic activity levels',
    XLB: 'Materials demand driven by construction and manufacturing',
    XLRE: 'Real estate values supported by low rates and economic growth',
    XLV: 'Defensive characteristics, less sensitive to economic cycles',
    XLP: 'Consumer staples provide stability but limited upside in expansion',
    XLU: 'Utilities underperform when growth assets offer better returns',
    XLC: 'Communication services mix of growth and defensive characteristics'
};

export const REGIME_CONTEXT: Record<string, {
    description: string;
    characteristics: string[];
    marketBehavior: string;
}> = {
    EXPANSION: {
        description: 'Strong economic growth with positive yield curve and healthy labor market',
        characteristics: [
            'GDP growth above trend',
            'Positive yield curve (10Y-2Y)',
            'Low unemployment rate',
            'Rising corporate earnings'
        ],
        marketBehavior: 'Cyclical sectors tend to outperform. Risk-on environment favors growth assets.'
    },
    'MID-CYCLE': {
        description: 'Mature expansion phase with moderating growth and stable inflation',
        characteristics: [
            'GDP growth at or near trend',
            'Flattening yield curve',
            'Stable employment',
            'Balanced sector rotation'
        ],
        marketBehavior: 'Quality and balanced exposure preferred. Sector selection becomes critical.'
    },
    SLOWDOWN: {
        description: 'Economic deceleration with potential yield curve inversion',
        characteristics: [
            'GDP growth below trend',
            'Flat or inverted yield curve',
            'Rising unemployment',
            'Margin compression'
        ],
        marketBehavior: 'Defensive positioning recommended. Focus on quality and dividend yield.'
    },
    RECESSION: {
        description: 'Economic contraction with negative growth and rising unemployment',
        characteristics: [
            'Negative GDP growth',
            'Inverted yield curve',
            'Rising unemployment',
            'Earnings recession'
        ],
        marketBehavior: 'Flight to quality. Defensive sectors and cash preservation strategies.'
    }
};
