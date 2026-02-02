/**
 * metricsCalculator.cjs
 * Calculates derived financial metrics (TTM, YoY, QoQ, margins, ratios)
 */

// ===========================
// HELPER: GET NESTED VALUE
// ===========================
function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

// ===========================
// TTM CALCULATIONS
// ===========================
function calculateTTM(bundle, series, currentIndex) {
    if (currentIndex + 3 >= series.length) return null;

    const quarters = series.slice(currentIndex, currentIndex + 4);

    // Verificar que sean 4 quarters consecutivos
    if (quarters.length !== 4) return null;

    const ttmMetrics = {
        revenue: null,
        net_income: null,
        operating_income: null,
        operating_cash_flow: null,
        free_cash_flow: null
    };

    const paths = {
        revenue: 'reported.income.revenue',
        net_income: 'reported.income.net_income',
        operating_income: 'reported.income.operating_income',
        operating_cash_flow: 'reported.cashflow.operating_cash_flow',
        free_cash_flow: 'reported.cashflow.free_cash_flow'
    };

    for (const [key, path] of Object.entries(paths)) {
        const values = quarters.map(q => getNestedValue(q, path)).filter(v => v != null);
        if (values.length === 4) {
            ttmMetrics[key] = values.reduce((sum, val) => sum + val, 0);
        }
    }

    return ttmMetrics;
}

// ===========================
// YOY GROWTH CALCULATIONS
// ===========================
function calculateYoY(bundle, series, currentIndex) {
    const currentPeriod = bundle.period;
    if (!currentPeriod?.fiscal_quarter) return null;

    // Buscar mismo quarter del año anterior
    const targetFY = currentPeriod.fiscal_year - 1;
    const targetQ = currentPeriod.fiscal_quarter;

    const priorYearQuarter = series.find(q =>
        q.period?.fiscal_year === targetFY &&
        q.period?.fiscal_quarter === targetQ
    );

    if (!priorYearQuarter) return null;

    const yoyMetrics = {};
    const metrics = ['revenue', 'net_income', 'operating_income', 'eps_diluted'];

    for (const metric of metrics) {
        const current = getNestedValue(bundle, `reported.income.${metric}`);
        const prior = getNestedValue(priorYearQuarter, `reported.income.${metric}`);

        if (current != null && prior != null && prior !== 0) {
            yoyMetrics[`${metric}_growth`] = ((current - prior) / Math.abs(prior)) * 100;
        }
    }

    return Object.keys(yoyMetrics).length > 0 ? yoyMetrics : null;
}

// ===========================
// QOQ GROWTH CALCULATIONS
// ===========================
function calculateQoQ(bundle, series, currentIndex) {
    if (currentIndex + 1 >= series.length) return null;

    const priorQuarter = series[currentIndex + 1];
    if (!priorQuarter) return null;

    const qoqMetrics = {};
    const metrics = ['revenue', 'net_income', 'operating_income'];

    for (const metric of metrics) {
        const current = getNestedValue(bundle, `reported.income.${metric}`);
        const prior = getNestedValue(priorQuarter, `reported.income.${metric}`);

        if (current != null && prior != null && prior !== 0) {
            qoqMetrics[`${metric}_growth`] = ((current - prior) / Math.abs(prior)) * 100;
        }
    }

    return Object.keys(qoqMetrics).length > 0 ? qoqMetrics : null;
}

// ===========================
// MARGIN CALCULATIONS
// ===========================
function calculateMargins(bundle) {
    const revenue = getNestedValue(bundle, 'reported.income.revenue');
    const grossProfit = getNestedValue(bundle, 'reported.income.gross_profit');
    const operatingIncome = getNestedValue(bundle, 'reported.income.operating_income');
    const netIncome = getNestedValue(bundle, 'reported.income.net_income');
    const fcf = getNestedValue(bundle, 'reported.cashflow.free_cash_flow');

    if (!revenue || revenue <= 0) return null;

    return {
        gross_margin: grossProfit != null ? (grossProfit / revenue) * 100 : null,
        operating_margin: operatingIncome != null ? (operatingIncome / revenue) * 100 : null,
        net_margin: netIncome != null ? (netIncome / revenue) * 100 : null,
        fcf_margin: fcf != null ? (fcf / revenue) * 100 : null
    };
}

// ===========================
// RETURN CALCULATIONS
// ===========================
function calculateROE(bundle) {
    const netIncome = getNestedValue(bundle, 'reported.income.net_income');
    const equity = getNestedValue(bundle, 'reported.balance.total_equity');

    if (!netIncome || !equity || equity <= 0) return null;

    return (netIncome / equity) * 100;
}

function calculateROA(bundle) {
    const netIncome = getNestedValue(bundle, 'reported.income.net_income');
    const assets = getNestedValue(bundle, 'reported.balance.total_assets');

    if (!netIncome || !assets || assets <= 0) return null;

    return (netIncome / assets) * 100;
}

function calculateROIC(bundle) {
    const netIncome = getNestedValue(bundle, 'reported.income.net_income');
    const equity = getNestedValue(bundle, 'reported.balance.total_equity');
    const ltDebt = getNestedValue(bundle, 'reported.balance.long_term_debt') || 0;

    const investedCapital = (equity || 0) + ltDebt;

    if (!netIncome || investedCapital <= 0) return null;

    return (netIncome / investedCapital) * 100;
}

function calculateReturns(bundle) {
    return {
        roe: calculateROE(bundle),
        roa: calculateROA(bundle),
        roic: calculateROIC(bundle)
    };
}

// ===========================
// EFFICIENCY CALCULATIONS
// ===========================
function calculateAssetTurnover(bundle) {
    const revenue = getNestedValue(bundle, 'reported.income.revenue');
    const assets = getNestedValue(bundle, 'reported.balance.total_assets');

    if (!revenue || !assets || assets <= 0) return null;

    return revenue / assets;
}

function calculateInventoryTurnover(bundle) {
    const cogs = getNestedValue(bundle, 'reported.income.cost_of_revenue');
    const inventory = getNestedValue(bundle, 'reported.balance.inventory');

    if (!cogs || !inventory || inventory <= 0) return null;

    return cogs / inventory;
}

function calculateEfficiency(bundle) {
    return {
        asset_turnover: calculateAssetTurnover(bundle),
        inventory_turnover: calculateInventoryTurnover(bundle)
    };
}

// ===========================
// LIQUIDITY CALCULATIONS
// ===========================
function calculateCurrentRatio(bundle) {
    const currentAssets = getNestedValue(bundle, 'reported.balance.current_assets');
    const currentLiab = getNestedValue(bundle, 'reported.balance.current_liabilities');

    if (!currentAssets || !currentLiab || currentLiab <= 0) return null;

    return currentAssets / currentLiab;
}

function calculateQuickRatio(bundle) {
    const currentAssets = getNestedValue(bundle, 'reported.balance.current_assets');
    const inventory = getNestedValue(bundle, 'reported.balance.inventory') || 0;
    const currentLiab = getNestedValue(bundle, 'reported.balance.current_liabilities');

    if (!currentAssets || !currentLiab || currentLiab <= 0) return null;

    return (currentAssets - inventory) / currentLiab;
}

function calculateLiquidity(bundle) {
    return {
        current_ratio: calculateCurrentRatio(bundle),
        quick_ratio: calculateQuickRatio(bundle)
    };
}

// ===========================
// ✅ FIX: LEVERAGE CALCULATIONS (DEBT/EQUITY)
// ===========================
function calculateDebtToEquity(bundle) {
    const stDebt = getNestedValue(bundle, 'reported.balance.short_term_debt') || 0;
    const ltDebt = getNestedValue(bundle, 'reported.balance.long_term_debt') || 0;
    const equity = getNestedValue(bundle, 'reported.balance.total_equity');

    // ✅ FIX: Calcular total debt aunque una de las dos falte
    const totalDebt = stDebt + ltDebt;

    if (totalDebt === 0) return null;
    if (!equity || equity <= 0) return null;

    return totalDebt / equity;
}

function calculateLeverage(bundle) {
    return {
        debt_to_equity: calculateDebtToEquity(bundle)
    };
}

// ===========================
// MASTER FUNCTION
// ===========================
function addComputedMetrics(bundle, series, index) {
    const computed = {
        margins: calculateMargins(bundle),
        returns: calculateReturns(bundle),
        efficiency: calculateEfficiency(bundle),
        liquidity: calculateLiquidity(bundle),
        leverage: calculateLeverage(bundle),
        growth: {
            yoy: calculateYoY(bundle, series, index) || {},
            qoq: calculateQoQ(bundle, series, index) || {}
        },
        ttm: calculateTTM(bundle, series, index) || {}
    };

    return {
        ...bundle,
        computed
    };
}

module.exports = {
    addComputedMetrics,
    calculateTTM,
    calculateYoY,
    calculateQoQ,
    calculateMargins,
    calculateROE,
    calculateROA,
    calculateROIC,
    calculateAssetTurnover,
    calculateInventoryTurnover,
    calculateCurrentRatio,
    calculateQuickRatio,
    calculateDebtToEquity,
    getNestedValue
};
