/**
 * XBRL Concept Mapper
 * Maps SEC XBRL tags to canonical financial statement line items
 */

const CONCEPT_MAPPINGS = {
    // ===========================
    // INCOME STATEMENT
    // ===========================
    revenue: [
        'RevenueFromContractWithCustomerExcludingAssessedTax',
        'RevenueFromContractWithCustomerIncludingAssessedTax',
        'SalesRevenueNet',
        'Revenues'
    ],

    cost_of_revenue: [
        'CostOfRevenue',
        'CostOfGoodsAndServicesSold'
    ],

    gross_profit: [
        'GrossProfit'
    ],

    research_and_development: [
        'ResearchAndDevelopmentExpense'
    ],

    sales_and_marketing: [
        'SellingAndMarketingExpense',
        'SellingExpense'
    ],

    general_and_administrative: [
        'GeneralAndAdministrativeExpense'
    ],

    operating_expenses: [
        'OperatingExpenses',
        'CostsAndExpenses'
    ],

    operating_income: [
        'OperatingIncomeLoss'
    ],

    interest_expense: [
        'InterestExpense'
    ],

    interest_income: [
        'InterestIncomeExpenseNet',
        'InvestmentIncomeInterest',
        'InterestAndDividendIncomeOperating'
    ],

    other_income: [
        'OtherNonoperatingIncomeExpense',
        'NonoperatingIncomeExpense'
    ],

    income_before_tax: [
        'IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest',
        'IncomeLossFromContinuingOperationsBeforeIncomeTaxesMinorityInterestAndIncomeLossFromEquityMethodInvestments'
    ],

    income_tax_expense: [
        'IncomeTaxExpenseBenefit'
    ],

    net_income: [
        'NetIncomeLoss'
    ],

    eps_basic: [
        'EarningsPerShareBasic'
    ],

    eps_diluted: [
        'EarningsPerShareDiluted'
    ],

    // ===========================
    // BALANCE SHEET - ASSETS
    // ===========================
    cash_and_equivalents: [
        'CashAndCashEquivalentsAtCarryingValue',
        'Cash'
    ],

    short_term_investments: [
        'AvailableForSaleSecuritiesCurrent',
        'ShortTermInvestments',
        'MarketableSecuritiesCurrent'
    ],

    accounts_receivable: [
        'AccountsReceivableNetCurrent',
        'ReceivablesNetCurrent'
    ],

    inventory: [
        'InventoryNet'
    ],

    prepaid_expenses: [
        'PrepaidExpenseAndOtherAssetsCurrent',
        'PrepaidExpenseCurrent'
    ],

    other_current_assets: [
        'OtherAssetsCurrent'
    ],

    current_assets: [
        'AssetsCurrent'
    ],

    property_plant_equipment: [
        'PropertyPlantAndEquipmentNet'
    ],

    goodwill: [
        'Goodwill'
    ],

    intangible_assets: [
        'IntangibleAssetsNetExcludingGoodwill',
        'FiniteLivedIntangibleAssetsNet'
    ],

    long_term_investments: [
        'AvailableForSaleSecuritiesNoncurrent',
        'LongTermInvestments',
        'MarketableSecuritiesNoncurrent'
    ],

    other_noncurrent_assets: [
        'OtherAssetsNoncurrent'
    ],

    noncurrent_assets: [
        'AssetsNoncurrent'
    ],

    total_assets: [
        'Assets'
    ],

    // ===========================
    // BALANCE SHEET - LIABILITIES
    // ===========================
    accounts_payable: [
        'AccountsPayableCurrent'
    ],

    short_term_debt: [
        'DebtCurrent',
        'ShortTermBorrowings',
        'ShortTermDebtCurrent'
    ],

    accrued_expenses: [
        'AccruedLiabilitiesCurrent',
        'AccruedIncomeTaxesCurrent'
    ],

    deferred_revenue_current: [
        'DeferredRevenueCurrent',
        'ContractWithCustomerLiabilityCurrent'
    ],

    other_current_liabilities: [
        'OtherLiabilitiesCurrent'
    ],

    current_liabilities: [
        'LiabilitiesCurrent'
    ],

    long_term_debt: [
        'LongTermDebtNoncurrent',
        'LongTermDebt'
    ],

    deferred_tax: [
        'DeferredTaxLiabilitiesNoncurrent'
    ],

    deferred_revenue_noncurrent: [
        'DeferredRevenueNoncurrent',
        'ContractWithCustomerLiabilityNoncurrent'
    ],

    other_noncurrent_liabilities: [
        'OtherLiabilitiesNoncurrent'
    ],

    noncurrent_liabilities: [
        'LiabilitiesNoncurrent'
    ],

    total_liabilities: [
        'Liabilities'
    ],

    // ===========================
    // BALANCE SHEET - EQUITY
    // ===========================
    common_stock: [
        'CommonStockValue'
    ],

    additional_paid_in_capital: [
        'AdditionalPaidInCapital',
        'AdditionalPaidInCapitalCommonStock'
    ],

    retained_earnings: [
        'RetainedEarningsAccumulatedDeficit'
    ],

    treasury_stock: [
        'TreasuryStockValue'
    ],

    accumulated_other_comprehensive_income: [
        'AccumulatedOtherComprehensiveIncomeLossNetOfTax'
    ],

    total_equity: [
        'StockholdersEquity',
        'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest'
    ],

    // ===========================
    // CASH FLOW STATEMENT
    // ===========================
    depreciation_amortization: [
        'DepreciationDepletionAndAmortization',
        'Depreciation'
    ],

    stock_based_compensation: [
        'ShareBasedCompensation',
        'AllocatedShareBasedCompensationExpense'
    ],

    changes_in_working_capital: [
        'IncreaseDecreaseInOperatingCapital',
        'IncreaseDecreaseInOperatingAssetsAndLiabilities'
    ],

    deferred_income_tax: [
        'DeferredIncomeTaxExpenseBenefit'
    ],

    other_operating_activities: [
        'OtherOperatingActivitiesCashFlowStatement'
    ],

    operating_cash_flow: [
        'NetCashProvidedByUsedInOperatingActivities'
    ],

    capex: [
        'PaymentsToAcquirePropertyPlantAndEquipment'
    ],

    acquisitions: [
        'PaymentsToAcquireBusinessesNetOfCashAcquired'
    ],

    purchases_of_investments: [
        'PaymentsToAcquireInvestments',
        'PaymentsToAcquireAvailableForSaleSecurities'
    ],

    sales_of_investments: [
        'ProceedsFromSaleOfInvestments',
        'ProceedsFromSaleOfAvailableForSaleSecurities'
    ],

    other_investing_activities: [
        'PaymentsForProceedsFromOtherInvestingActivities'
    ],

    investing_cash_flow: [
        'NetCashProvidedByUsedInInvestingActivities'
    ],

    debt_issued: [
        'ProceedsFromIssuanceOfLongTermDebt',
        'ProceedsFromDebtNetOfIssuanceCosts'
    ],

    debt_repaid: [
        'RepaymentsOfLongTermDebt',
        'RepaymentsOfDebt'
    ],

    dividends_paid: [
        'PaymentsOfDividends',
        'PaymentsOfDividendsCommonStock'
    ],

    stock_repurchased: [
        'PaymentsForRepurchaseOfCommonStock'
    ],

    stock_issued: [
        'ProceedsFromIssuanceOfCommonStock'
    ],

    other_financing_activities: [
        'ProceedsFromPaymentsForOtherFinancingActivities'
    ],

    financing_cash_flow: [
        'NetCashProvidedByUsedInFinancingActivities'
    ],

    net_change_in_cash: [
        'CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalentsPeriodIncreaseDecreaseIncludingExchangeRateEffect',
        'CashAndCashEquivalentsPeriodIncreaseDecrease'
    ],

    diluted_shares: [
        'WeightedAverageNumberOfDilutedSharesOutstanding'
    ],

    basic_shares: [
        'WeightedAverageNumberOfSharesOutstandingBasic'
    ]
};

/**
 * Helper para extraer items de un fact object
 */
function extractFactItems(factObj, unitWanted) {
    if (!factObj?.units) return [];

    const units = factObj.units;
    const unitKeys = Object.keys(units);
    if (!unitKeys.length) return [];

    let pickUnitKey = null;
    if (unitWanted === 'USD') {
        pickUnitKey = unitKeys.find(k => k === 'USD') || unitKeys.find(k => k.startsWith('USD')) || unitKeys[0];
    } else if (unitWanted === 'shares') {
        pickUnitKey = unitKeys.find(k => k === 'shares') || unitKeys.find(k => k.toLowerCase().includes('shares')) || unitKeys[0];
    } else if (unitWanted === 'pure') {
        pickUnitKey = unitKeys.find(k => k === 'pure') || unitKeys[0];
    } else {
        pickUnitKey = unitKeys[0];
    }

    const arr = Array.isArray(units[pickUnitKey]) ? units[pickUnitKey] : [];
    if (!arr.length) return [];

    const okForms = new Set(['10-Q', '10-K', '20-F', '40-F', '6-K', '8-K']);
    const base = arr
        .filter(x => typeof x.val === 'number' && x.end)
        .filter(x => okForms.has(String(x.form)));

    const list = base.length ? base : arr.filter(x => typeof x.val === 'number' && x.end);

    return list.map(item => ({
        value: item.val,
        start: item.start ?? null,
        end: item.end ?? null,
        filed: item.filed ?? null,
        form: item.form ?? null,
        fp: item.fp ?? null,
        fy: item.fy ?? null,
        frame: item.frame ?? null,
        unit: pickUnitKey,
    }));
}

/**
 * Extrae el primer concepto disponible de una lista
 * @param {Object} facts - us-gaap facts object
 * @param {Array<string>} concepts - lista de conceptos XBRL en orden de preferencia
 * @param {string} unit - 'USD', 'shares', 'pure'
 * @returns {Array} items extraídos
 */
function extractFirstAvailable(facts, concepts, unit = 'USD') {
    // Validar que concepts sea array
    if (!Array.isArray(concepts)) {
        console.error('❌ extractFirstAvailable ERROR: concepts must be an array');
        console.error('   Received type:', typeof concepts);
        console.error('   Received value:', concepts);
        return [];
    }

    if (!facts || typeof facts !== 'object') {
        console.error('❌ extractFirstAvailable ERROR: facts must be an object');
        return [];
    }

    for (const concept of concepts) {
        if (!facts[concept]) continue;
        const items = extractFactItems(facts[concept], unit);
        if (items && items.length > 0) {
            return items;
        }
    }
    return [];
}

module.exports = {
    CONCEPT_MAPPINGS,
    extractFirstAvailable,
    extractFactItems
};
