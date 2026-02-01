/**
 * Metrics Calculator
 * Calcula TTM, growth rates, margins, ratios desde series de quarters
 */

/**
 * Calcula Trailing Twelve Months para una métrica
 * @param {Array} series - Array de bundles ordenados desc por date
 * @param {string} path - Path a la métrica (ej: 'income.revenue')
 * @param {number} periods - Número de períodos a sumar (default: 4)
 * @returns {number|null}
 */
function calculateTTM(series, path, periods = 4) {
    if (!series || series.length < periods) return null;

    const recentQuarters = series.slice(0, periods);

    let sum = 0;
    let hasData = false;

    for (const quarter of recentQuarters) {
        const value = getNestedValue(quarter.reported, path);
        if (value === null || value === undefined) return null;
        sum += value;
        hasData = true;
    }

    return hasData ? sum : null;
}

/**
 * Calcula Year-over-Year growth
 * @param {number} current - Valor actual
 * @param {number} yearAgo - Valor hace 1 año (4 quarters atrás)
 * @returns {number|null} - Porcentaje de crecimiento
 */
/**
 * Calcula Year-over-Year growth
 * @param {number} current - Valor actual
 * @param {number} yearAgo - Valor hace 1 año (4 quarters atrás)
 * @returns {number|null} - Porcentaje de crecimiento
 */
function calculateYoY(current, yearAgo) {
    if (current == null || yearAgo == null || yearAgo === 0) return null;
    return ((current - yearAgo) / yearAgo) * 100;
}


/**
 * Calcula Quarter-over-Quarter growth
 * @param {number} current - Valor actual
 * @param {number} previous - Valor quarter anterior
 * @returns {number|null} - Porcentaje de crecimiento
 */
function calculateQoQ(current, previous) {
    if (current == null || previous == null || previous === 0) return null;
    return ((current - previous) / previous) * 100;
}

/**
 * Calcula YoY para una serie completa
 * @param {Array} series - Array de bundles ordenados desc
 * @param {string} path - Path a la métrica
 * @returns {Array} - Series con yoy_growth agregado
 */
function addYoYToSeries(series, path) {
    return series.map((quarter, index) => {
        const current = getNestedValue(quarter.reported, path);
        const yearAgoIndex = index + 4; // 4 quarters = 1 year

        if (yearAgoIndex >= series.length) {
            return { ...quarter, yoy_growth: null };
        }

        const yearAgo = getNestedValue(series[yearAgoIndex].reported, path);
        const yoy = calculateYoY(current, yearAgo);

        return {
            ...quarter,
            computed: {
                ...(quarter.computed || {}),
                [`${path.replace(/\./g, '_')}_yoy`]: yoy
            }
        };
    });
}

/**
 * Calcula QoQ para una serie completa
 * @param {Array} series - Array de bundles ordenados desc
 * @param {string} path - Path a la métrica
 * @returns {Array} - Series con qoq_growth agregado
 */
function addQoQToSeries(series, path) {
    return series.map((quarter, index) => {
        const current = getNestedValue(quarter.reported, path);

        if (index === 0) {
            return { ...quarter, qoq_growth: null }; // Primer quarter no tiene anterior
        }

        const previous = getNestedValue(series[index - 1].reported, path);
        const qoq = calculateQoQ(current, previous);

        return {
            ...quarter,
            computed: {
                ...(quarter.computed || {}),
                [`${path.replace(/\./g, '_')}_qoq`]: qoq
            }
        };
    });
}

/**
 * Calcula margins para un quarter
 * @param {Object} reported - Objeto reported de un bundle
 * @returns {Object} - Margins calculados
 */
function calculateMargins(reported) {
    const revenue = reported?.income?.revenue;
    const grossProfit = reported?.income?.gross_profit;
    const operatingIncome = reported?.income?.operating_income;
    const netIncome = reported?.income?.net_income;
    const fcf = reported?.cashflow?.free_cash_flow;

    if (!revenue || revenue === 0) return {};

    return {
        gross_margin: grossProfit !== null ? (grossProfit / revenue) * 100 : null,
        operating_margin: operatingIncome !== null ? (operatingIncome / revenue) * 100 : null,
        net_margin: netIncome !== null ? (netIncome / revenue) * 100 : null,
        fcf_margin: fcf !== null ? (fcf / revenue) * 100 : null
    };
}

/**
 * Calcula ROE (Return on Equity)
 * @param {number} netIncome - Net income (quarterly or TTM)
 * @param {number} totalEquity - Total equity (point in time)
 * @returns {number|null} - ROE en %
 */
function calculateROE(netIncome, totalEquity) {
    if (!netIncome || !totalEquity || totalEquity === 0) return null;
    return (netIncome / totalEquity) * 100;
}

/**
 * Calcula ROA (Return on Assets)
 * @param {number} netIncome - Net income (quarterly or TTM)
 * @param {number} totalAssets - Total assets (point in time)
 * @returns {number|null} - ROA en %
 */
function calculateROA(netIncome, totalAssets) {
    if (!netIncome || !totalAssets || totalAssets === 0) return null;
    return (netIncome / totalAssets) * 100;
}

/**
 * Calcula ROIC (Return on Invested Capital)
 * @param {number} operatingIncome - Operating income después de tax
 * @param {number} totalAssets - Total assets
 * @param {number} currentLiabilities - Current liabilities
 * @returns {number|null} - ROIC en %
 */
function calculateROIC(operatingIncome, totalAssets, currentLiabilities) {
    if (!operatingIncome || !totalAssets || currentLiabilities === null) return null;

    const investedCapital = totalAssets - currentLiabilities;
    if (investedCapital === 0) return null;

    return (operatingIncome / investedCapital) * 100;
}

/**
 * Calcula asset turnover (eficiencia)
 * @param {number} revenue - Revenue (quarterly or TTM)
 * @param {number} totalAssets - Total assets
 * @returns {number|null} - Asset turnover ratio
 */
function calculateAssetTurnover(revenue, totalAssets) {
    if (!revenue || !totalAssets || totalAssets === 0) return null;
    return revenue / totalAssets;
}

/**
 * Calcula inventory turnover
 * @param {number} costOfRevenue - COGS (quarterly or TTM)
 * @param {number} inventory - Inventory (point in time)
 * @returns {number|null} - Inventory turnover ratio
 */
function calculateInventoryTurnover(costOfRevenue, inventory) {
    if (!costOfRevenue || !inventory || inventory === 0) return null;
    return costOfRevenue / inventory;
}

/**
 * Calcula Current Ratio (liquidez)
 * @param {number} currentAssets
 * @param {number} currentLiabilities
 * @returns {number|null}
 */
function calculateCurrentRatio(currentAssets, currentLiabilities) {
    if (!currentAssets || !currentLiabilities || currentLiabilities === 0) return null;
    return currentAssets / currentLiabilities;
}

/**
 * Calcula Quick Ratio (acid test)
 * @param {number} currentAssets
 * @param {number} inventory
 * @param {number} currentLiabilities
 * @returns {number|null}
 */
function calculateQuickRatio(currentAssets, inventory, currentLiabilities) {
    if (!currentAssets || currentLiabilities === 0) return null;
    const quickAssets = currentAssets - (inventory || 0);
    return quickAssets / currentLiabilities;
}

/**
 * Calcula Debt-to-Equity ratio
 * @param {number} totalLiabilities
 * @param {number} totalEquity
 * @returns {number|null}
 */
function calculateDebtToEquity(totalLiabilities, totalEquity) {
    if (!totalLiabilities || !totalEquity || totalEquity === 0) return null;
    return totalLiabilities / totalEquity;
}

/**
 * Agrega todas las métricas computadas a un bundle
 * @param {Object} bundle - Bundle con period + reported
 * @param {Array} fullSeries - Serie completa para TTM calculations
 * @param {number} indexInSeries - Índice del bundle en la serie
 * @returns {Object} - Bundle con computed metrics agregados
 */
function addComputedMetrics(bundle, fullSeries, indexInSeries) {
    const reported = bundle.reported;

    // Margins
    const margins = calculateMargins(reported);

    // Return metrics (usando valores del quarter actual)
    const roe = calculateROE(
        reported.income?.net_income,
        reported.balance?.total_equity
    );

    const roa = calculateROA(
        reported.income?.net_income,
        reported.balance?.total_assets
    );

    const roic = calculateROIC(
        reported.income?.operating_income,
        reported.balance?.total_assets,
        reported.balance?.current_liabilities
    );

    // Efficiency ratios
    const assetTurnover = calculateAssetTurnover(
        reported.income?.revenue,
        reported.balance?.total_assets
    );

    const inventoryTurnover = calculateInventoryTurnover(
        reported.income?.cost_of_revenue,
        reported.balance?.inventory
    );

    // Liquidity ratios
    const currentRatio = calculateCurrentRatio(
        reported.balance?.current_assets,
        reported.balance?.current_liabilities
    );

    const quickRatio = calculateQuickRatio(
        reported.balance?.current_assets,
        reported.balance?.inventory,
        reported.balance?.current_liabilities
    );

    // Leverage
    const debtToEquity = calculateDebtToEquity(
        reported.balance?.total_liabilities,
        reported.balance?.total_equity
    );

    // YoY growth (si hay datos de hace 1 año)
    let yoyGrowth = {};
    if (indexInSeries + 4 < fullSeries.length) {
        const yearAgo = fullSeries[indexInSeries + 4];
        yoyGrowth = {
            revenue_yoy: calculateYoY(
                reported.income?.revenue,
                yearAgo.reported.income?.revenue
            ),
            operating_income_yoy: calculateYoY(
                reported.income?.operating_income,
                yearAgo.reported.income?.operating_income
            ),
            net_income_yoy: calculateYoY(
                reported.income?.net_income,
                yearAgo.reported.income?.net_income
            ),
            eps_yoy: calculateYoY(
                reported.income?.eps_diluted,
                yearAgo.reported.income?.eps_diluted
            )
        };
    }

    // QoQ growth (si hay quarter anterior)
    let qoqGrowth = {};
    if (indexInSeries > 0) {
        const prevQuarter = fullSeries[indexInSeries - 1];
        qoqGrowth = {
            revenue_qoq: calculateQoQ(
                reported.income?.revenue,
                prevQuarter.reported.income?.revenue
            ),
            operating_income_qoq: calculateQoQ(
                reported.income?.operating_income,
                prevQuarter.reported.income?.operating_income
            ),
            net_income_qoq: calculateQoQ(
                reported.income?.net_income,
                prevQuarter.reported.income?.net_income
            )
        };
    }

    // TTM (si hay 4+ quarters)
    let ttm = {};
    if (fullSeries.length >= 4) {
        const last4 = fullSeries.slice(indexInSeries, indexInSeries + 4);
        if (last4.length === 4) {
            ttm = {
                revenue_ttm: calculateTTM(fullSeries.slice(indexInSeries), 'income.revenue', 4),
                operating_income_ttm: calculateTTM(fullSeries.slice(indexInSeries), 'income.operating_income', 4),
                net_income_ttm: calculateTTM(fullSeries.slice(indexInSeries), 'income.net_income', 4),
                operating_cash_flow_ttm: calculateTTM(fullSeries.slice(indexInSeries), 'cashflow.operating_cash_flow', 4),
                free_cash_flow_ttm: calculateTTM(fullSeries.slice(indexInSeries), 'cashflow.free_cash_flow', 4)
            };
        }
    }

    return {
        ...bundle,
        computed: {
            margins,
            returns: { roe, roa, roic },
            efficiency: { asset_turnover: assetTurnover, inventory_turnover: inventoryTurnover },
            liquidity: { current_ratio: currentRatio, quick_ratio: quickRatio },
            leverage: { debt_to_equity: debtToEquity },
            growth: { yoy: yoyGrowth, qoq: qoqGrowth },
            ttm
        }
    };
}

/**
 * Helper para obtener valor anidado de un objeto
 * @param {Object} obj
 * @param {string} path - 'income.revenue'
 * @returns {*}
 */
function getNestedValue(obj, path) {
    return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

module.exports = {
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
    addComputedMetrics,
    addYoYToSeries,
    addQoQToSeries,
    getNestedValue
};
