/**
 * Fiscal Period Deriver
 * Calcula FY/Q automáticamente desde end date + fiscal year end month
 */

/**
 * @typedef {Object} FiscalPeriod
 * @property {number} fiscal_year
 * @property {string} fiscal_quarter - "Q1", "Q2", "Q3", "Q4"
 * @property {string} period_id - "FY2026Q2"
 */

/**
 * Deriva fiscal period desde end date
 * @param {string} endDate - "YYYY-MM-DD"
 * @param {number} fiscalYearEndMonth - 1-12 (6=Jun, 12=Dec)
 * @returns {FiscalPeriod}
 */
function deriveFiscalPeriod(endDate, fiscalYearEndMonth) {
    if (!endDate || !fiscalYearEndMonth) {
        throw new Error('endDate and fiscalYearEndMonth required');
    }

    const d = new Date(endDate);
    if (isNaN(d.getTime())) {
        throw new Error(`Invalid endDate: ${endDate}`);
    }

    const year = d.getFullYear();
    const month = d.getMonth() + 1; // 1-12

    // Calcular fiscal year
    let fiscalYear = year;
    if (month > fiscalYearEndMonth) {
        fiscalYear = year + 1;
    }

    // Calcular fiscal quarter
    const monthsFromFYEnd = ((month - fiscalYearEndMonth + 12) % 12) || 12;
    const fiscalQuarter = Math.ceil(monthsFromFYEnd / 3);

    return {
        fiscal_year: fiscalYear,
        fiscal_quarter: `Q${fiscalQuarter}`,
        period_id: `FY${fiscalYear}Q${fiscalQuarter}`
    };
}

/**
 * Valida delta entre filing date y quarter end date
 * @param {string} filingDate
 * @param {string} quarterEndDate
 * @returns {number|null} días entre filing y end (positivo si filing > end), null si inválido
 */
function validateFilingDelta(filingDate, quarterEndDate) {
    // Validar inputs antes de crear Date objects
    if (!filingDate || !quarterEndDate) {
        return null;
    }

    const filing = new Date(filingDate);
    const end = new Date(quarterEndDate);

    if (isNaN(filing.getTime()) || isNaN(end.getTime())) {
        return null;
    }

    const deltaDays = Math.round((filing - end) / (1000 * 60 * 60 * 24));
    return deltaDays;
}

/**
 * Detecta fiscal year end month de una empresa
 * (basado en el patrón de Q4 en los datos)
 * @param {Array} items - lista de facts con { end, fp }
 * @returns {number} month 1-12
 */
function detectFiscalYearEnd(items) {
    // Buscar todos los Q4
    const q4Items = items.filter(x => String(x?.fp).toUpperCase() === 'Q4');

    if (!q4Items.length) return 12; // default: calendar year

    // Tomar el mes más frecuente de Q4 ends
    const monthCounts = {};
    for (const item of q4Items) {
        const d = new Date(item.end);
        const month = d.getMonth() + 1;
        monthCounts[month] = (monthCounts[month] || 0) + 1;
    }

    // Retornar el mes con más Q4 ends
    let maxMonth = 12;
    let maxCount = 0;
    for (const [month, count] of Object.entries(monthCounts)) {
        if (count > maxCount) {
            maxCount = count;
            maxMonth = parseInt(month);
        }
    }

    return maxMonth;
}

module.exports = {
    deriveFiscalPeriod,
    validateFilingDelta,
    detectFiscalYearEnd
};
