/**
 * Tests for xbrlConceptMapper.cjs
 */

const {
    CONCEPT_MAPPINGS,
    extractFirstAvailable,
    extractFactItems
} = require('../xbrlConceptMapper.cjs');

describe('CONCEPT_MAPPINGS', () => {
    test('should have all required income statement mappings', () => {
        expect(CONCEPT_MAPPINGS.revenue).toBeDefined();
        expect(Array.isArray(CONCEPT_MAPPINGS.revenue)).toBe(true);
        expect(CONCEPT_MAPPINGS.revenue.length).toBeGreaterThan(0);

        expect(CONCEPT_MAPPINGS.operating_income).toBeDefined();
        expect(CONCEPT_MAPPINGS.net_income).toBeDefined();
        expect(CONCEPT_MAPPINGS.eps_diluted).toBeDefined();
    });

    test('should have all required balance sheet mappings', () => {
        expect(CONCEPT_MAPPINGS.total_assets).toBeDefined();
        expect(CONCEPT_MAPPINGS.total_liabilities).toBeDefined();
        expect(CONCEPT_MAPPINGS.total_equity).toBeDefined();
        expect(CONCEPT_MAPPINGS.cash_and_equivalents).toBeDefined();
        expect(CONCEPT_MAPPINGS.long_term_debt).toBeDefined();
    });

    test('should have all required cash flow mappings', () => {
        expect(CONCEPT_MAPPINGS.operating_cash_flow).toBeDefined();
        expect(CONCEPT_MAPPINGS.capex).toBeDefined();
        expect(CONCEPT_MAPPINGS.investing_cash_flow).toBeDefined();
        expect(CONCEPT_MAPPINGS.financing_cash_flow).toBeDefined();
    });

    test('should have fallback concepts for each mapping', () => {
        // Revenue should have multiple fallbacks
        expect(CONCEPT_MAPPINGS.revenue.length).toBeGreaterThanOrEqual(2);

        // Short term investments should have fallbacks
        expect(CONCEPT_MAPPINGS.short_term_investments.length).toBeGreaterThanOrEqual(2);

        // Long term debt should have fallbacks
        expect(CONCEPT_MAPPINGS.long_term_debt.length).toBeGreaterThanOrEqual(2);
    });
});

describe('extractFactItems', () => {
    test('should extract USD items correctly', () => {
        const mockFact = {
            units: {
                USD: [
                    {
                        val: 1000000,
                        end: '2025-12-31',
                        filed: '2026-01-30',
                        form: '10-Q',
                        fp: 'Q2',
                        fy: 2026
                    },
                    {
                        val: 900000,
                        end: '2025-09-30',
                        filed: '2025-10-30',
                        form: '10-Q',
                        fp: 'Q1',
                        fy: 2026
                    }
                ]
            }
        };

        const items = extractFactItems(mockFact, 'USD');

        expect(items).toHaveLength(2);
        expect(items[0].value).toBe(1000000);
        expect(items[0].end).toBe('2025-12-31');
        expect(items[0].unit).toBe('USD');
    });

    test('should extract shares items correctly', () => {
        const mockFact = {
            units: {
                shares: [
                    {
                        val: 7460000000,
                        end: '2025-12-31',
                        filed: '2026-01-30',
                        form: '10-Q'
                    }
                ]
            }
        };

        const items = extractFactItems(mockFact, 'shares');

        expect(items).toHaveLength(1);
        expect(items[0].value).toBe(7460000000);
        expect(items[0].unit).toBe('shares');
    });

    test('should extract pure (EPS) items correctly', () => {
        const mockFact = {
            units: {
                pure: [
                    {
                        val: 5.15,
                        end: '2025-12-31',
                        filed: '2026-01-30',
                        form: '10-Q'
                    }
                ]
            }
        };

        const items = extractFactItems(mockFact, 'pure');

        expect(items).toHaveLength(1);
        expect(items[0].value).toBe(5.15);
        expect(items[0].unit).toBe('pure');
    });

    test('should return empty array for null fact', () => {
        const items = extractFactItems(null, 'USD');
        expect(items).toEqual([]);
    });

    test('should return empty array for fact without units', () => {
        const mockFact = { label: 'Revenue' };
        const items = extractFactItems(mockFact, 'USD');
        expect(items).toEqual([]);
    });

    test('should filter out non-numeric values', () => {
        const mockFact = {
            units: {
                USD: [
                    {
                        val: 1000000,
                        end: '2025-12-31',
                        form: '10-Q'
                    },
                    {
                        val: null,
                        end: '2025-09-30',
                        form: '10-Q'
                    },
                    {
                        val: 'N/A',
                        end: '2025-06-30',
                        form: '10-Q'
                    }
                ]
            }
        };

        const items = extractFactItems(mockFact, 'USD');

        expect(items).toHaveLength(1);
        expect(items[0].value).toBe(1000000);
    });

    test('should prioritize acceptable forms', () => {
        const mockFact = {
            units: {
                USD: [
                    {
                        val: 1000000,
                        end: '2025-12-31',
                        form: '10-Q'
                    },
                    {
                        val: 900000,
                        end: '2025-12-31',
                        form: '8-K/A' // Not in acceptable forms
                    }
                ]
            }
        };

        const items = extractFactItems(mockFact, 'USD');

        // Should prioritize 10-Q
        expect(items[0].value).toBe(1000000);
        expect(items[0].form).toBe('10-Q');
    });
});

describe('extractFirstAvailable', () => {
    test('should return first available concept', () => {
        const mockFacts = {
            RevenueFromContractWithCustomerExcludingAssessedTax: {
                units: {
                    USD: [
                        {
                            val: 1000000,
                            end: '2025-12-31',
                            form: '10-Q'
                        }
                    ]
                }
            },
            Revenues: {
                units: {
                    USD: [
                        {
                            val: 900000,
                            end: '2025-12-31',
                            form: '10-Q'
                        }
                    ]
                }
            }
        };

        const concepts = [
            'RevenueFromContractWithCustomerExcludingAssessedTax',
            'Revenues'
        ];

        const items = extractFirstAvailable(mockFacts, concepts, 'USD');

        expect(items).toHaveLength(1);
        expect(items[0].value).toBe(1000000); // First concept should be selected
    });

    test('should fallback to second concept if first is missing', () => {
        const mockFacts = {
            Revenues: {
                units: {
                    USD: [
                        {
                            val: 900000,
                            end: '2025-12-31',
                            form: '10-Q'
                        }
                    ]
                }
            }
        };

        const concepts = [
            'RevenueFromContractWithCustomerExcludingAssessedTax',
            'Revenues'
        ];

        const items = extractFirstAvailable(mockFacts, concepts, 'USD');

        expect(items).toHaveLength(1);
        expect(items[0].value).toBe(900000); // Should fallback to second
    });

    test('should return empty array if no concepts available', () => {
        const mockFacts = {};

        const concepts = [
            'RevenueFromContractWithCustomerExcludingAssessedTax',
            'Revenues'
        ];

        const items = extractFirstAvailable(mockFacts, concepts, 'USD');

        expect(items).toEqual([]);
    });

    test('should skip empty concepts', () => {
        const mockFacts = {
            ConceptA: {
                units: {
                    USD: [] // Empty
                }
            },
            ConceptB: {
                units: {
                    USD: [
                        {
                            val: 500000,
                            end: '2025-12-31',
                            form: '10-Q'
                        }
                    ]
                }
            }
        };

        const concepts = ['ConceptA', 'ConceptB'];

        const items = extractFirstAvailable(mockFacts, concepts, 'USD');

        expect(items).toHaveLength(1);
        expect(items[0].value).toBe(500000); // Should skip empty ConceptA
    });
});
