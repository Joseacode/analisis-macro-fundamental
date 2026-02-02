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

// ===========================
// HELPER: CREATE MOCK BUNDLE
// ===========================
function createMockBundle(overrides = {}) {
    return {
        period: {
            fiscal_year: 2026,
            fiscal_quarter: 'Q2',
            period_id: 'FY2026Q2',
            quarter_end_date: '2025-12-31'
        },
        reported: {
            income: {
                revenue: null,
                gross_profit: null,
                operating_income: null,
                net_income: null,
                ...overrides.income
            },
            balance: {
                total_assets: null,
                total_equity: null,
                current_assets: null,
                current_liabilities: null,
                inventory: null,
                short_term_debt: null,
                long_term_debt: null,
                ...overrides.balance
            },
            cashflow: {
                operating_cash_flow: null,
                free_cash_flow: null,
                ...overrides.cashflow
            }
        },
        ...overrides
    };
}

// ===========================
// TESTS: YOY GROWTH
// ===========================
describe('calculateYoY', () => {
    test('should calculate positive YoY growth', () => {
        const series = [
            createMockBundle({
                period: { fiscal_year: 2026, fiscal_quarter: 'Q2' },
                reported: { income: { revenue: 120000000, net_income: 30000000 } }
            }),
            createMockBundle({
                period: { fiscal_year: 2026, fiscal_quarter: 'Q1' },
                reported: { income: { revenue: 110000000 } }
            }),
            createMockBundle({
                period: { fiscal_year: 2025, fiscal_quarter: 'Q2' },
                reported: { income: { revenue: 100000000, net_income: 25000000 } }
            })
        ];

        const yoy = calculateYoY(series[0], series, 0);
        expect(yoy.revenue_growth).toBeCloseTo(20, 1);
        expect(yoy.net_income_growth).toBeCloseTo(20, 1);
    });

    test('should return null if prior year quarter not found', () => {
        const series = [
            createMockBundle({
                period: { fiscal_year: 2026, fiscal_quarter: 'Q2' },
                reported: { income: { revenue: 120000000 } }
            })
        ];

        const yoy = calculateYoY(series[0], series, 0);
        expect(yoy).toBeNull();
    });

    test('should handle null revenue gracefully', () => {
        const series = [
            createMockBundle({
                period: { fiscal_year: 2026, fiscal_quarter: 'Q2' },
                reported: { income: { revenue: null } }
            }),
            createMockBundle({
                period: { fiscal_year: 2025, fiscal_quarter: 'Q2' },
                reported: { income: { revenue: 100000000 } }
            })
        ];

        const yoy = calculateYoY(series[0], series, 0);
        expect(yoy).toBeNull();
    });
});

// ===========================
// TESTS: QOQ GROWTH
// ===========================
describe('calculateQoQ', () => {
    test('should calculate positive QoQ growth', () => {
        const series = [
            createMockBundle({
                reported: { income: { revenue: 110000000, net_income: 28000000 } }
            }),
            createMockBundle({
                reported: { income: { revenue: 100000000, net_income: 25000000 } }
            })
        ];

        const qoq = calculateQoQ(series[0], series, 0);
        expect(qoq.revenue_growth).toBeCloseTo(10, 1);
        expect(qoq.net_income_growth).toBeCloseTo(12, 1);
    });

    test('should return null if no prior quarter', () => {
        const series = [
            createMockBundle({
                reported: { income: { revenue: 110000000 } }
            })
        ];

        const qoq = calculateQoQ(series[0], series, 0);
        expect(qoq).toBeNull();
    });

    test('should handle null values gracefully', () => {
        const series = [
            createMockBundle({
                reported: { income: { revenue: null } }
            }),
            createMockBundle({
                reported: { income: { revenue: 100000000 } }
            })
        ];

        const qoq = calculateQoQ(series[0], series, 0);
        expect(qoq).toBeNull();
    });
});

// ===========================
// TESTS: TTM
// ===========================
describe('calculateTTM', () => {
    test('should calculate TTM for revenue', () => {
        const series = [
            createMockBundle({ reported: { income: { revenue: 100000000 } } }),
            createMockBundle({ reported: { income: { revenue: 110000000 } } }),
            createMockBundle({ reported: { income: { revenue: 105000000 } } }),
            createMockBundle({ reported: { income: { revenue: 95000000 } } })
        ];

        const ttm = calculateTTM(series[0], series, 0);
        expect(ttm.revenue).toBe(410000000);
    });

    test('should return null if not enough periods', () => {
        const series = [
            createMockBundle({ reported: { income: { revenue: 100000000 } } }),
            createMockBundle({ reported: { income: { revenue: 110000000 } } })
        ];

        const ttm = calculateTTM(series[0], series, 0);
        expect(ttm).toBeNull();
    });

    test('should handle null values gracefully', () => {
        const series = [
            createMockBundle({ reported: { income: { revenue: 100000000 } } }),
            createMockBundle({ reported: { income: { revenue: null } } }),
            createMockBundle({ reported: { income: { revenue: 105000000 } } }),
            createMockBundle({ reported: { income: { revenue: 95000000 } } })
        ];

        const ttm = calculateTTM(series[0], series, 0);
        expect(ttm.revenue).toBeNull();
    });
});

// ===========================
// TESTS: MARGINS
// ===========================
describe('calculateMargins', () => {
    test('should calculate all margins correctly', () => {
        const bundle = createMockBundle({
            reported: {
                income: {
                    revenue: 1000000000,
                    gross_profit: 700000000,
                    operating_income: 400000000,
                    net_income: 300000000
                },
                cashflow: {
                    free_cash_flow: 250000000
                }
            }
        });

        const margins = calculateMargins(bundle);

        expect(margins.gross_margin).toBeCloseTo(70, 1);
        expect(margins.operating_margin).toBeCloseTo(40, 1);
        expect(margins.net_margin).toBeCloseTo(30, 1);
        expect(margins.fcf_margin).toBeCloseTo(25, 1);
    });

    test('should return null if revenue is 0', () => {
        const bundle = createMockBundle({
            reported: {
                income: { revenue: 0 }
            }
        });

        const margins = calculateMargins(bundle);
        expect(margins).toBeNull();
    });

    test('should handle null values correctly', () => {
        const bundle = createMockBundle({
            reported: {
                income: {
                    revenue: 1000000000,
                    gross_profit: null,
                    operating_income: 400000000,
                    net_income: null
                },
                cashflow: {
                    free_cash_flow: 250000000
                }
            }
        });

        const margins = calculateMargins(bundle);

        expect(margins.gross_margin).toBeNull();
        expect(margins.operating_margin).toBeCloseTo(40, 1);
        expect(margins.net_margin).toBeNull();
        expect(margins.fcf_margin).toBeCloseTo(25, 1);
    });
});

// ===========================
// TESTS: ROE
// ===========================
describe('calculateROE', () => {
    test('should calculate ROE correctly', () => {
        const bundle = createMockBundle({
            reported: {
                income: { net_income: 50000000 },
                balance: { total_equity: 500000000 }
            }
        });

        const roe = calculateROE(bundle);
        expect(roe).toBeCloseTo(10, 1);
    });

    test('should return null for zero equity', () => {
        const bundle = createMockBundle({
            reported: {
                income: { net_income: 50000000 },
                balance: { total_equity: 0 }
            }
        });

        expect(calculateROE(bundle)).toBeNull();
    });

    test('should handle negative net income', () => {
        const bundle = createMockBundle({
            reported: {
                income: { net_income: -20000000 },
                balance: { total_equity: 500000000 }
            }
        });

        const roe = calculateROE(bundle);
        expect(roe).toBeCloseTo(-4, 1);
    });
});

// ===========================
// TESTS: ROA
// ===========================
describe('calculateROA', () => {
    test('should calculate ROA correctly', () => {
        const bundle = createMockBundle({
            reported: {
                income: { net_income: 40000000 },
                balance: { total_assets: 1000000000 }
            }
        });

        const roa = calculateROA(bundle);
        expect(roa).toBeCloseTo(4, 1);
    });

    test('should return null for zero assets', () => {
        const bundle = createMockBundle({
            reported: {
                income: { net_income: 40000000 },
                balance: { total_assets: 0 }
            }
        });

        expect(calculateROA(bundle)).toBeNull();
    });
});

// ===========================
// TESTS: ROIC
// ===========================
describe('calculateROIC', () => {
    test('should calculate ROIC correctly', () => {
        const bundle = createMockBundle({
            reported: {
                income: { net_income: 60000000 },
                balance: {
                    total_equity: 500000000,
                    long_term_debt: 300000000
                }
            }
        });

        const roic = calculateROIC(bundle);
        expect(roic).toBeCloseTo(7.5, 1);
    });

    test('should return null if invested capital is zero', () => {
        const bundle = createMockBundle({
            reported: {
                income: { net_income: 60000000 },
                balance: {
                    total_equity: 0,
                    long_term_debt: 0
                }
            }
        });

        expect(calculateROIC(bundle)).toBeNull();
    });
});

// ===========================
// TESTS: ASSET TURNOVER
// ===========================
describe('calculateAssetTurnover', () => {
    test('should calculate asset turnover correctly', () => {
        const bundle = createMockBundle({
            reported: {
                income: { revenue: 500000000 },
                balance: { total_assets: 1000000000 }
            }
        });

        const turnover = calculateAssetTurnover(bundle);
        expect(turnover).toBeCloseTo(0.5, 2);
    });

    test('should return null for zero assets', () => {
        const bundle = createMockBundle({
            reported: {
                income: { revenue: 500000000 },
                balance: { total_assets: 0 }
            }
        });

        expect(calculateAssetTurnover(bundle)).toBeNull();
    });
});

// ===========================
// TESTS: INVENTORY TURNOVER
// ===========================
describe('calculateInventoryTurnover', () => {
    test('should calculate inventory turnover correctly', () => {
        const bundle = createMockBundle({
            reported: {
                income: { cost_of_revenue: 300000000 },
                balance: { inventory: 50000000 }
            }
        });

        const turnover = calculateInventoryTurnover(bundle);
        expect(turnover).toBeCloseTo(6, 1);
    });

    test('should return null for zero inventory', () => {
        const bundle = createMockBundle({
            reported: {
                income: { cost_of_revenue: 300000000 },
                balance: { inventory: 0 }
            }
        });

        expect(calculateInventoryTurnover(bundle)).toBeNull();
    });
});

// ===========================
// TESTS: CURRENT RATIO
// ===========================
describe('calculateCurrentRatio', () => {
    test('should calculate current ratio correctly', () => {
        const bundle = createMockBundle({
            reported: {
                balance: {
                    current_assets: 300000000,
                    current_liabilities: 200000000
                }
            }
        });

        const ratio = calculateCurrentRatio(bundle);
        expect(ratio).toBeCloseTo(1.5, 2);
    });

    test('should return null for zero liabilities', () => {
        const bundle = createMockBundle({
            reported: {
                balance: {
                    current_assets: 300000000,
                    current_liabilities: 0
                }
            }
        });

        expect(calculateCurrentRatio(bundle)).toBeNull();
    });
});

// ===========================
// TESTS: QUICK RATIO
// ===========================
describe('calculateQuickRatio', () => {
    test('should calculate quick ratio correctly', () => {
        const bundle = createMockBundle({
            reported: {
                balance: {
                    current_assets: 300000000,
                    inventory: 50000000,
                    current_liabilities: 200000000
                }
            }
        });

        const ratio = calculateQuickRatio(bundle);
        expect(ratio).toBeCloseTo(1.25, 2);
    });

    test('should handle null inventory', () => {
        const bundle = createMockBundle({
            reported: {
                balance: {
                    current_assets: 300000000,
                    inventory: null,
                    current_liabilities: 200000000
                }
            }
        });

        const ratio = calculateQuickRatio(bundle);
        expect(ratio).toBeCloseTo(1.5, 2);
    });

    test('should return null for zero liabilities', () => {
        const bundle = createMockBundle({
            reported: {
                balance: {
                    current_assets: 300000000,
                    inventory: 50000000,
                    current_liabilities: 0
                }
            }
        });

        expect(calculateQuickRatio(bundle)).toBeNull();
    });
});

// ===========================
// TESTS: DEBT TO EQUITY (FIXED)
// ===========================
describe('calculateDebtToEquity - Fixed', () => {
    test('should calculate with both short and long term debt', () => {
        const bundle = createMockBundle({
            reported: {
                balance: {
                    short_term_debt: 8401000000,
                    long_term_debt: 34445000000,
                    total_equity: 96094000000
                }
            }
        });

        const result = calculateDebtToEquity(bundle);
        expect(result).toBeCloseTo(0.446, 2);
    });

    test('should handle missing short term debt', () => {
        const bundle = createMockBundle({
            reported: {
                balance: {
                    short_term_debt: null,
                    long_term_debt: 34445000000,
                    total_equity: 96094000000
                }
            }
        });

        const result = calculateDebtToEquity(bundle);
        expect(result).toBeCloseTo(0.358, 2);
    });

    test('should handle missing long term debt', () => {
        const bundle = createMockBundle({
            reported: {
                balance: {
                    short_term_debt: 8401000000,
                    long_term_debt: null,
                    total_equity: 96094000000
                }
            }
        });

        const result = calculateDebtToEquity(bundle);
        expect(result).toBeCloseTo(0.087, 2);
    });

    test('should return null if both debts are zero or missing', () => {
        const bundle = createMockBundle({
            reported: {
                balance: {
                    short_term_debt: 0,
                    long_term_debt: 0,
                    total_equity: 96094000000
                }
            }
        });

        expect(calculateDebtToEquity(bundle)).toBeNull();
    });

    test('should return null if equity is zero or negative', () => {
        const bundle = createMockBundle({
            reported: {
                balance: {
                    short_term_debt: 8401000000,
                    long_term_debt: 34445000000,
                    total_equity: 0
                }
            }
        });

        expect(calculateDebtToEquity(bundle)).toBeNull();
    });
});
