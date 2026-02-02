/**
 * xbrlConceptMapper.cjs
 * Maps XBRL concepts to standardized financial metrics
 */

const CONCEPT_MAPPINGS = {
    // ===========================
    // INCOME STATEMENT
    // ===========================
    revenue: [
        'Revenues',
        'RevenueFromContractWithCustomerExcludingAssessedTax',
        'SalesRevenueNet',
        'RevenueFromContractWithCustomerIncludingAssessedTax'
    ],
    cost_of_revenue: [
        'CostOfRevenue',
        'CostOfGoodsAndServicesSold',
        'CostOfGoodsSold'
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
        'OperatingCostsAndExpenses',
        'CostsAndExpenses'
    ],
    // ✅ NUEVO: Total costs and expenses
    total_costs_and_expenses: [
        'CostsAndExpenses',
        'OperatingCostsAndExpenses',
        'CostOfRevenue'
    ],
    operating_income: [
        'OperatingIncomeLoss'
    ],
    interest_expense: [
        'InterestExpense'
    ],
    interest_income: [
        'InterestIncomeExpenseNet',
        'InvestmentIncomeInterest'
    ],
    other_income: [
        'NonoperatingIncomeExpense',
        'OtherNonoperatingIncomeExpense'
    ],
    income_before_tax: [
        'IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest',
        'IncomeLossFromContinuingOperationsBeforeIncomeTaxesMinorityInterestAndIncomeLossFromEquityMethodInvestments'
    ],
    income_tax_expense: [
        'IncomeTaxExpenseBenefit'
    ],
    net_income: [
        'NetIncomeLoss',
        'ProfitLoss'
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
        'ShortTermInvestments',
        'AvailableForSaleSecuritiesCurrent'
    ],
    accounts_receivable: [
        'AccountsReceivableNetCurrent',
        'ReceivablesNetCurrent'
    ],
    inventory: [
        'InventoryNet'
    ],
    prepaid_expenses: [
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
        'IntangibleAssetsNetExcludingGoodwill'
    ],
    long_term_investments: [
        'LongTermInvestments',
        'AvailableForSaleSecuritiesNoncurrent'
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
        'ShortTermBorrowings'
    ],
    accrued_liabilities: [
        'AccruedLiabilitiesCurrent',
        'OtherAccruedLiabilitiesCurrent'
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
        'DeferredIncomeTaxLiabilitiesNet'
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
        'AdditionalPaidInCapital'
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
        'StockholdersEquity'
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
        'IncreaseDecreaseInOperatingCapital'
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
        'PaymentsToAcquireInvestments'
    ],
    sales_of_investments: [
        'ProceedsFromSaleOfInvestments'
    ],
    other_investing_activities: [
        'PaymentsForProceedsFromOtherInvestingActivities'
    ],
    investing_cash_flow: [
        'NetCashProvidedByUsedInInvestingActivities'
    ],
    debt_issued: [
        'ProceedsFromIssuanceOfDebt'
    ],
    debt_repaid: [
        'RepaymentsOfDebt'
    ],
    dividends_paid: [
        'PaymentsOfDividends'
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
        'CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalentsPeriodIncreaseDecreaseIncludingExchangeRateEffect'
    ],

    // ===========================
    // SHARES
    // ===========================
    diluted_shares: [
        'WeightedAverageNumberOfDilutedSharesOutstanding'
    ],
    basic_shares: [
        'WeightedAverageNumberOfSharesOutstandingBasic'
    ]
};

/**
 * Extract fact items for a given unit
 */
function extractFactItems(fact, unit = 'USD') {
    if (!fact?.units) return [];

    const unitData = fact.units[unit];
    if (!unitData || !Array.isArray(unitData)) return [];

    return unitData.map(item => ({
        value: item.val ?? null,
        start: item.start ?? null,
        end: item.end ?? null,
        filed: item.filed ?? null,
        form: item.form ?? null,
        fp: item.fp ?? null,
        fy: item.fy ?? null,
        frame: item.frame ?? null,
        unit: unit
    }));
}

/**
 * Extract first available concept from a list of fallbacks
 */
function extractFirstAvailable(facts, concepts, unit = 'USD') {
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
