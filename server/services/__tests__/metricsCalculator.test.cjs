/**
 * Tests for metricsCalculator.cjs
 */

const {
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
} = require('../metricsCalculator.cjs');

describe('getNestedValue', () => {
    test('should get nested value from object', () => {
        const obj = {
            income: {
                revenue: 100000000
            }
        };
        expect(getNestedValue(obj, 'income.revenue')).toBe(100000000);
    });

    test('should return undefined for non-existent path', () => {
        const obj = { income: {} };
        expect(getNestedValue(obj, 'income.revenue')).toBeUndefined();
    });

    test('should handle null objects', () => {
        expect(getNestedValue(null, 'income.revenue')).toBeUndefined();
    });
});

describe('calculateYoY', () => {
    test('should calculate positive YoY growth', () => {
        const current = 120000000;
        const yearAgo = 100000000;
        const yoy = calculateYoY(current, yearAgo);
        expect(yoy).toBe(20); // 20% growth
    });

    test('should calculate negative YoY growth', () => {
        const current = 80000000;
        const yearAgo = 100000000;
        const yoy = calculateYoY(current, yearAgo);
        expect(yoy).toBe(-20); // -20% decline
    });

    test('should return null for zero yearAgo', () => {
        expect(calculateYoY(100, 0)).toBeNull();
    });

    test('should return null for null inputs', () => {
        expect(calculateYoY(null, 100)).toBeNull();
        expect(calculateYoY(100, null)).toBeNull();
    });

    test('should handle negative values correctly', () => {
        const current = -50000000; // Loss decreased
        const yearAgo = -100000000; // Bigger loss
        const yoy = calculateYoY(current, yearAgo);
        expect(yoy).toBe(-50); // Loss decreased by 50%
    });
});

describe('calculateQoQ', () => {
    test('should calculate positive QoQ growth', () => {
        const current = 110000000;
        const previous = 100000000;
        const qoq = calculateQoQ(current, previous);
        expect(qoq).toBe(10); // 10% growth
    });

    test('should calculate negative QoQ growth', () => {
        const current = 95000000;
        const previous = 100000000;
        const qoq = calculateQoQ(current, previous);
        expect(qoq).toBe(-5); // -5% decline
    });

    test('should return null for zero previous', () => {
        expect(calculateQoQ(100, 0)).toBeNull();
    });

    test('should return null for null inputs', () => {
        expect(calculateQoQ(null, 100)).toBeNull();
        expect(calculateQoQ(100, null)).toBeNull();
    });
});

describe('calculateTTM', () => {
    test('should calculate TTM for revenue', () => {
        const series = [
            { reported: { income: { revenue: 100000000 } } },
            { reported: { income: { revenue: 110000000 } } },
            { reported: { income: { revenue: 105000000 } } },
            { reported: { income: { revenue: 95000000 } } }
        ];
        const ttm = calculateTTM(series, 'income.revenue', 4);
        expect(ttm).toBe(410000000); // Sum of 4 quarters
    });

    test('should return null if not enough periods', () => {
        const series = [
            { reported: { income: { revenue: 100000000 } } },
            { reported: { income: { revenue: 110000000 } } }
        ];
        const ttm = calculateTTM(series, 'income.revenue', 4);
        expect(ttm).toBeNull(); // Only 2 quarters, needs 4
    });

    test('should return null if any quarter has null value', () => {
        const series = [
            { reported: { income: { revenue: 100000000 } } },
            { reported: { income: { revenue: null } } },
            { reported: { income: { revenue: 105000000 } } },
            { reported: { income: { revenue: 95000000 } } }
        ];
        const ttm = calculateTTM(series, 'income.revenue', 4);
        expect(ttm).toBeNull();
    });

    test('should handle negative values (cashflow)', () => {
        const series = [
            { reported: { cashflow: { capex: -20000000 } } },
            { reported: { cashflow: { capex: -25000000 } } },
            { reported: { cashflow: { capex: -22000000 } } },
            { reported: { cashflow: { capex: -23000000 } } }
        ];
        const ttm = calculateTTM(series, 'cashflow.capex', 4);
        expect(ttm).toBe(-90000000);
    });
});

describe('calculateMargins', () => {
    test('should calculate all margins correctly', () => {
        const reported = {
            income: {
                revenue: 100000000,
                gross_profit: 70000000,
                operating_income: 40000000,
                net_income: 30000000
            },
            cashflow: {
                free_cash_flow: 25000000
            }
        };

        const margins = calculateMargins(reported);

        expect(margins.gross_margin).toBe(70);
        expect(margins.operating_margin).toBe(40);
        expect(margins.net_margin).toBe(30);
        expect(margins.fcf_margin).toBe(25);
    });

    test('should return empty object if revenue is 0', () => {
        const reported = {
            income: {
                revenue: 0,
                gross_profit: 0,
                operating_income: 0,
                net_income: 0
            }
        };

        const margins = calculateMargins(reported);
        expect(margins).toEqual({});
    });

    test('should handle null values correctly', () => {
        const reported = {
            income: {
                revenue: 100000000,
                gross_profit: null,
                operating_income: 40000000,
                net_income: null
            },
            cashflow: {
                free_cash_flow: 25000000
            }
        };

        const margins = calculateMargins(reported);

        expect(margins.gross_margin).toBeNull();
        expect(margins.operating_margin).toBe(40);
        expect(margins.net_margin).toBeNull();
        expect(margins.fcf_margin).toBe(25);
    });

    test('should return empty object if revenue is null', () => {
        const reported = {
            income: {
                revenue: null
            }
        };

        const margins = calculateMargins(reported);
        expect(margins).toEqual({});
    });
});

describe('calculateROE', () => {
    test('should calculate ROE correctly', () => {
        const netIncome = 50000000;
        const totalEquity = 500000000;
        const roe = calculateROE(netIncome, totalEquity);
        expect(roe).toBe(10); // 10% ROE
    });

    test('should return null for zero equity', () => {
        expect(calculateROE(50000000, 0)).toBeNull();
    });

    test('should return null for null inputs', () => {
        expect(calculateROE(null, 500000000)).toBeNull();
        expect(calculateROE(50000000, null)).toBeNull();
    });

    test('should handle negative net income', () => {
        const netIncome = -20000000;
        const totalEquity = 500000000;
        const roe = calculateROE(netIncome, totalEquity);
        expect(roe).toBe(-4); // -4% ROE (loss)
    });
});

describe('calculateROA', () => {
    test('should calculate ROA correctly', () => {
        const netIncome = 40000000;
        const totalAssets = 1000000000;
        const roa = calculateROA(netIncome, totalAssets);
        expect(roa).toBe(4); // 4% ROA
    });

    test('should return null for zero assets', () => {
        expect(calculateROA(40000000, 0)).toBeNull();
    });

    test('should return null for null inputs', () => {
        expect(calculateROA(null, 1000000000)).toBeNull();
        expect(calculateROA(40000000, null)).toBeNull();
    });
});

describe('calculateROIC', () => {
    test('should calculate ROIC correctly', () => {
        const operatingIncome = 60000000;
        const totalAssets = 1000000000;
        const currentLiabilities = 200000000;
        const roic = calculateROIC(operatingIncome, totalAssets, currentLiabilities);
        expect(roic).toBe(7.5); // 60M / (1000M - 200M) = 7.5%
    });

    test('should return null if invested capital is zero', () => {
        const roic = calculateROIC(60000000, 200000000, 200000000);
        expect(roic).toBeNull();
    });

    test('should return null for null inputs', () => {
        expect(calculateROIC(null, 1000000000, 200000000)).toBeNull();
        expect(calculateROIC(60000000, null, 200000000)).toBeNull();
        expect(calculateROIC(60000000, 1000000000, null)).toBeNull();
    });
});

describe('calculateAssetTurnover', () => {
    test('should calculate asset turnover correctly', () => {
        const revenue = 500000000;
        const totalAssets = 1000000000;
        const turnover = calculateAssetTurnover(revenue, totalAssets);
        expect(turnover).toBe(0.5); // 0.5x turnover
    });

    test('should return null for zero assets', () => {
        expect(calculateAssetTurnover(500000000, 0)).toBeNull();
    });

    test('should return null for null inputs', () => {
        expect(calculateAssetTurnover(null, 1000000000)).toBeNull();
        expect(calculateAssetTurnover(500000000, null)).toBeNull();
    });
});

describe('calculateInventoryTurnover', () => {
    test('should calculate inventory turnover correctly', () => {
        const cogs = 300000000;
        const inventory = 50000000;
        const turnover = calculateInventoryTurnover(cogs, inventory);
        expect(turnover).toBe(6); // 6x turnover
    });

    test('should return null for zero inventory', () => {
        expect(calculateInventoryTurnover(300000000, 0)).toBeNull();
    });

    test('should return null for null inputs', () => {
        expect(calculateInventoryTurnover(null, 50000000)).toBeNull();
        expect(calculateInventoryTurnover(300000000, null)).toBeNull();
    });
});

describe('calculateCurrentRatio', () => {
    test('should calculate current ratio correctly', () => {
        const currentAssets = 300000000;
        const currentLiabilities = 200000000;
        const ratio = calculateCurrentRatio(currentAssets, currentLiabilities);
        expect(ratio).toBe(1.5); // 1.5x
    });

    test('should return null for zero liabilities', () => {
        expect(calculateCurrentRatio(300000000, 0)).toBeNull();
    });

    test('should return null for null inputs', () => {
        expect(calculateCurrentRatio(null, 200000000)).toBeNull();
        expect(calculateCurrentRatio(300000000, null)).toBeNull();
    });
});

describe('calculateQuickRatio', () => {
    test('should calculate quick ratio correctly', () => {
        const currentAssets = 300000000;
        const inventory = 50000000;
        const currentLiabilities = 200000000;
        const ratio = calculateQuickRatio(currentAssets, inventory, currentLiabilities);
        expect(ratio).toBe(1.25); // (300M - 50M) / 200M = 1.25
    });

    test('should handle null inventory', () => {
        const currentAssets = 300000000;
        const currentLiabilities = 200000000;
        const ratio = calculateQuickRatio(currentAssets, null, currentLiabilities);
        expect(ratio).toBe(1.5); // Treats inventory as 0
    });

    test('should return null for zero liabilities', () => {
        expect(calculateQuickRatio(300000000, 50000000, 0)).toBeNull();
    });

    test('should return null for null current assets', () => {
        expect(calculateQuickRatio(null, 50000000, 200000000)).toBeNull();
    });
});

describe('calculateDebtToEquity', () => {
    test('should calculate debt-to-equity correctly', () => {
        const totalLiabilities = 600000000;
        const totalEquity = 400000000;
        const ratio = calculateDebtToEquity(totalLiabilities, totalEquity);
        expect(ratio).toBe(1.5); // 1.5x leverage
    });

    test('should return null for zero equity', () => {
        expect(calculateDebtToEquity(600000000, 0)).toBeNull();
    });

    test('should return null for null inputs', () => {
        expect(calculateDebtToEquity(null, 400000000)).toBeNull();
        expect(calculateDebtToEquity(600000000, null)).toBeNull();
    });
});
