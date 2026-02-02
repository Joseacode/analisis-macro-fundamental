/**
 * Tests for fiscalPeriodDeriver.cjs
 */

const {
    deriveFiscalPeriod,
    validateFilingDelta,
    detectFiscalYearEnd
} = require('../fiscalPeriodDeriver.cjs');

describe('deriveFiscalPeriod', () => {
    test('MSFT (FY end = June)', () => {
        expect(deriveFiscalPeriod('2025-12-31', 6)).toEqual({
            fiscal_year: 2026,
            fiscal_quarter: 'Q2',
            period_id: 'FY2026Q2'
        });

        expect(deriveFiscalPeriod('2025-09-30', 6)).toEqual({
            fiscal_year: 2026,
            fiscal_quarter: 'Q1',
            period_id: 'FY2026Q1'
        });

        expect(deriveFiscalPeriod('2025-06-30', 6)).toEqual({
            fiscal_year: 2025,
            fiscal_quarter: 'Q4',
            period_id: 'FY2025Q4'
        });

        expect(deriveFiscalPeriod('2025-03-31', 6)).toEqual({
            fiscal_year: 2025,
            fiscal_quarter: 'Q3',
            period_id: 'FY2025Q3'
        });
    });

    test('AAPL (FY end = September)', () => {
        expect(deriveFiscalPeriod('2025-12-31', 9)).toEqual({
            fiscal_year: 2026,
            fiscal_quarter: 'Q1',
            period_id: 'FY2026Q1'
        });

        expect(deriveFiscalPeriod('2025-09-30', 9)).toEqual({
            fiscal_year: 2025,
            fiscal_quarter: 'Q4',
            period_id: 'FY2025Q4'
        });

        expect(deriveFiscalPeriod('2025-06-30', 9)).toEqual({
            fiscal_year: 2025,
            fiscal_quarter: 'Q3',
            period_id: 'FY2025Q3'
        });
    });

    test('WMT (FY end = January)', () => {
        expect(deriveFiscalPeriod('2025-04-30', 1)).toEqual({
            fiscal_year: 2026,
            fiscal_quarter: 'Q1',
            period_id: 'FY2026Q1'
        });

        expect(deriveFiscalPeriod('2025-01-31', 1)).toEqual({
            fiscal_year: 2025,
            fiscal_quarter: 'Q4',
            period_id: 'FY2025Q4'
        });

        expect(deriveFiscalPeriod('2024-10-31', 1)).toEqual({
            fiscal_year: 2025,
            fiscal_quarter: 'Q3',
            period_id: 'FY2025Q3'
        });
    });

    test('Calendar year company (FY end = December)', () => {
        expect(deriveFiscalPeriod('2025-12-31', 12)).toEqual({
            fiscal_year: 2025,
            fiscal_quarter: 'Q4',
            period_id: 'FY2025Q4'
        });

        expect(deriveFiscalPeriod('2025-09-30', 12)).toEqual({
            fiscal_year: 2025,
            fiscal_quarter: 'Q3',
            period_id: 'FY2025Q3'
        });

        expect(deriveFiscalPeriod('2025-06-30', 12)).toEqual({
            fiscal_year: 2025,
            fiscal_quarter: 'Q2',
            period_id: 'FY2025Q2'
        });

        expect(deriveFiscalPeriod('2025-03-31', 12)).toEqual({
            fiscal_year: 2025,
            fiscal_quarter: 'Q1',
            period_id: 'FY2025Q1'
        });
    });

    test('Invalid dates throw errors', () => {
        expect(() => deriveFiscalPeriod('invalid', 6)).toThrow('Invalid endDate');
        expect(() => deriveFiscalPeriod(null, 6)).toThrow('endDate and fiscalYearEndMonth required');
        expect(() => deriveFiscalPeriod('2025-12-31', null)).toThrow('endDate and fiscalYearEndMonth required');
    });
});

describe('validateFilingDelta', () => {
    test('Normal case (filing 30 days after end)', () => {
        // ✅ FIX: Orden correcto (end, filed)
        expect(validateFilingDelta('2025-12-31', '2026-01-30')).toBe(30);
    });

    test('Filing 45 days after end (within normal range)', () => {
        expect(validateFilingDelta('2025-12-31', '2026-02-14')).toBe(45);
    });

    test('Filing before end (negative - warning)', () => {
        expect(validateFilingDelta('2025-12-31', '2025-12-15')).toBe(-16);
    });

    test('Filing delayed (>60 days - warning)', () => {
        expect(validateFilingDelta('2025-12-31', '2026-03-15')).toBe(74);
    });

    test('Same day filing', () => {
        expect(validateFilingDelta('2025-12-31', '2025-12-31')).toBe(0);
    });

    test('Invalid date should return null', () => {
        expect(validateFilingDelta('invalid', '2026-01-30')).toBeNull();
        expect(validateFilingDelta('2025-12-31', 'invalid')).toBeNull();
    });

    test('Null inputs should return null', () => {
        expect(validateFilingDelta(null, '2026-01-30')).toBeNull();
        expect(validateFilingDelta('2025-12-31', null)).toBeNull();
    });
});

describe('detectFiscalYearEnd', () => {
    test('Calendar year company (December)', () => {
        const items = [
            { end: '2024-12-31', fp: 'Q4' },
            { end: '2023-12-31', fp: 'Q4' },
            { end: '2022-12-31', fp: 'Q4' }
        ];
        expect(detectFiscalYearEnd(items)).toBe(12);
    });

    test('MSFT (June year end)', () => {
        const items = [
            { end: '2025-06-30', fp: 'Q4' },
            { end: '2024-06-30', fp: 'Q4' },
            { end: '2023-06-30', fp: 'Q4' }
        ];
        expect(detectFiscalYearEnd(items)).toBe(6);
    });

    test('AAPL (September year end)', () => {
        const items = [
            { end: '2025-09-30', fp: 'Q4' },
            { end: '2024-09-30', fp: 'Q4' },
            { end: '2023-09-30', fp: 'Q4' }
        ];
        expect(detectFiscalYearEnd(items)).toBe(9);
    });

    test('WMT (January year end)', () => {
        const items = [
            { end: '2025-01-31', fp: 'Q4' },
            { end: '2024-01-31', fp: 'Q4' },
            { end: '2023-01-31', fp: 'Q4' }
        ];
        expect(detectFiscalYearEnd(items)).toBe(1);
    });

    test('No Q4 items returns default (December)', () => {
        const items = [
            { end: '2025-09-30', fp: 'Q3' },
            { end: '2025-06-30', fp: 'Q2' },
            { end: '2025-03-31', fp: 'Q1' }
        ];
        expect(detectFiscalYearEnd(items)).toBe(12);
    });

    test('Empty items array returns default (December)', () => {
        expect(detectFiscalYearEnd([])).toBe(12);
    });
});
