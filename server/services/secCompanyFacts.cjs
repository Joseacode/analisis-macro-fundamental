/**
 * secCompanyFacts.cjs
 * SEC XBRL Company Facts API wrapper
 * Extracts quarterly financial data from SEC CompanyFacts JSON
 */

const path = require('path');
const fs = require('fs/promises');

// ===========================
// IMPORTS
// ===========================

const {
    selectAnchorsRobust,
    isQuarterLike
} = require('./secCompanyFacts/helpers.cjs');


const {
    deriveFiscalPeriod,
    validateFilingDelta,
    detectFiscalYearEnd
} = require('./fiscalPeriodDeriver.cjs');

const {
    CONCEPT_MAPPINGS,
    extractFirstAvailable
} = require('./xbrlConceptMapper.cjs');

const {
    addComputedMetrics
} = require('./metricsCalculator.cjs');

const {
    getFiscalYearEndMonth
} = require('./secSubmissions.cjs');

// ===========================
// FILE CACHE HELPERS
// ===========================
async function readCacheJson(file, ttlMs) {
    try {
        const st = await fs.stat(file);
        if (Date.now() - st.mtimeMs > ttlMs) return null;
        const txt = await fs.readFile(file, 'utf-8');
        return JSON.parse(txt);
    } catch {
        return null;
    }
}

async function writeCacheJson(file, data) {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf-8');
}

// ===========================
// CIK / SYMBOL HELPERS
// ===========================
function padCik10(cik) {
    const s = String(cik ?? '').replace(/\D/g, '');
    return s.padStart(10, '0');
}

function normalizeSymbol(sym) {
    return String(sym ?? '').trim().toUpperCase().replace(/\./g, '-');
}

// ===========================
// SEC TICKER <-> CIK MAP
// ===========================
const SEC_CACHE_DIR = path.resolve(__dirname, '..', '.cache', 'sec');
const TICKER_MAP_FILE = path.join(SEC_CACHE_DIR, 'company-tickers.json');
const TICKER_MAP_TTL = 7 * 24 * 60 * 60 * 1000; // 7d

async function getTickerToCikMap() {
    const cached = await readCacheJson(TICKER_MAP_FILE, TICKER_MAP_TTL);
    if (cached?.map) return cached.map;

    const url = 'https://www.sec.gov/files/company_tickers.json';
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'institutional-macro-dashboard/1.0 (contact: jose)',
            'Accept': 'application/json',
        },
    });

    if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`SEC ticker map failed: ${res.status} ${txt.slice(0, 160)}`);
    }

    const json = await res.json();
    const map = {};
    for (const k of Object.keys(json)) {
        const row = json[k];
        if (!row?.ticker || !row?.cik_str) continue;
        map[String(row.ticker).toUpperCase()] = padCik10(row.cik_str);
    }

    await writeCacheJson(TICKER_MAP_FILE, {
        asOf: new Date().toISOString(),
        map
    });

    return map;
}

async function resolveCikFromTicker(ticker) {
    const t = normalizeSymbol(ticker);
    const map = await getTickerToCikMap();
    const cik = map[t];
    if (!cik) throw new Error(`No CIK for ticker ${t}`);
    return cik;
}

// ===========================
// SEC XBRL COMPANYFACTS
// ===========================
async function fetchCompanyFacts(cik10) {
    const cik = String(cik10).replace(/\D/g, '').padStart(10, '0');
    const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;
    const userAgent = process.env.SEC_USER_AGENT || 'institutional-macro-dashboard/1.0 (contact: jose@example.com)';

    console.log('Fetching CompanyFacts:', url);

    const resp = await fetch(url, {
        headers: {
            'User-Agent': userAgent,
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept': 'application/json',
        },
    });

    const text = await resp.text();
    console.log('SEC API response status:', resp.status);

    if (!resp.ok) {
        throw new Error(`SEC companyfacts fetch failed: ${resp.status} ${resp.statusText} ${text.slice(0, 200)}`);
    }

    let json;
    try {
        json = JSON.parse(text);
    } catch (e) {
        throw new Error(`SEC companyfacts invalid JSON: ${text.slice(0, 200)}`);
    }

    return json;
}

// ===========================
// HELPERS PARA PERIOD MATCHING
// ===========================
function daysBetween(start, end) {
    if (!start || !end) return null;
    const a = new Date(start);
    const b = new Date(end);
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
    return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

function isYTD(item) {
    const fp = String(item?.fp ?? '').toUpperCase();
    if (!['Q1', 'Q2', 'Q3', 'Q4'].includes(fp)) return false;
    const days = daysBetween(item?.start, item?.end);
    if (days != null) return days > 110;
    return !item?.start;
}


function computeQuarterlyDelta(allItems, anchor) {
    const { end, fy, fp } = anchor;

    if (fp === 'Q1') {
        const q1Items = allItems.filter(x => x?.end === end && x?.fy === fy && x?.fp === 'Q1' && x?.value != null);
        return q1Items.sort((a, b) => (String(a.filed) > String(b.filed) ? -1 : 1))[0] || null;
    }

    const ytdCandidates = allItems.filter(x => x?.end === end && x?.fy === fy && x?.fp === fp && x?.value != null);
    const ytdCurrent = ytdCandidates.find(isYTD) || ytdCandidates.sort((a, b) => (String(a.filed) > String(b.filed) ? -1 : 1))[0];

    if (!ytdCurrent) return null;

    const prevFpMap = { Q2: 'Q1', Q3: 'Q2', Q4: 'Q3' };
    const prevFp = prevFpMap[fp];

    const ytdPrevCandidates = allItems.filter(x => x?.fy === fy && x?.fp === prevFp && x?.value != null);
    const ytdPrev = ytdPrevCandidates.sort((a, b) => (String(a.filed) > String(b.filed) ? -1 : 1))[0];

    if (!ytdPrev) return ytdCurrent;

    const computed = ytdCurrent.value - ytdPrev.value;

    return {
        value: computed,
        start: ytdPrev.end,
        end: ytdCurrent.end,
        filed: ytdCurrent.filed,
        form: ytdCurrent.form,
        fp: ytdCurrent.fp,
        fy: ytdCurrent.fy,
        frame: ytdCurrent.frame,
        unit: ytdCurrent.unit,
        computed: true,
        method: 'ytd_delta'
    };
}

function extractQuarterValue(allItems, anchor) {
    const quarterItems = allItems.filter(isQuarterLike);
    const directMatch = quarterItems.filter(x =>
        x?.end === anchor.end &&
        x?.fy === anchor.fy &&
        x?.fp === anchor.fp &&
        x?.value != null
    );

    if (directMatch.length > 0) {
        return directMatch.sort((a, b) => (String(a.filed) > String(b.filed) ? -1 : 1))[0];
    }

    return computeQuarterlyDelta(allItems, anchor);
}

// ===========================
// PICKING HELPERS
// ===========================
function pickByEndBest(items, end) {
    const list = items.filter(x => x?.end === end && x.value != null);
    if (!list.length) return null;
    list.sort((a, b) => (String(a.filed) > String(b.filed) ? -1 : 1));
    return list[0];
}

function pickByEndStartBest(items, anchor) {
    const end = anchor?.end;
    const start = anchor?.start;

    if (!start) return pickByEndBest(items, end);

    const list = items.filter(x => x?.end === end && x?.start === start && x.value != null);
    if (!list.length) return null;
    list.sort((a, b) => (String(a.filed) > String(b.filed) ? -1 : 1));
    return list[0];
}

function buildPeriodId(picked) {
    const fy = picked?.fy;
    const fp = picked?.fp;
    const end = picked?.end;

    if (typeof fy === 'number' && fp) {
        const cleanFp = String(fp).toUpperCase().replace(/[^A-Z0-9]/g, '');
        return `FY${fy}${cleanFp}`;
    }

    if (end) return `END_${end}`;
    return null;
}

// ===========================
// ✅ VALIDATE BUNDLE CON WARNINGS ESPECÍFICOS + CONTEXT + GAP PRETAX
// ===========================
function validateBundle(bundle) {
    const w = [];
    const warnContext = {};

    const r = bundle?.reported?.income?.revenue ?? null;
    const op = bundle?.reported?.income?.operating_income ?? null;
    const ni = bundle?.reported?.income?.net_income ?? null;
    const otherIncome = bundle?.reported?.income?.other_income ?? null;
    const incomeBeforeTax = bundle?.reported?.income?.income_before_tax ?? null;
    const interestIncome = bundle?.reported?.income?.interest_income ?? null;
    const interestExpense = bundle?.reported?.income?.interest_expense ?? null;

    if (r === null || r <= 0) w.push('revenue_missing_or_non_positive');
    if (!bundle?.period?.period_id) w.push('period_id_missing');
    if (!bundle?.period?.quarter_end_date) w.push('quarter_end_date_missing');

    // ✅ Warning con thresholds determinísticos
    if (ni != null && op != null && op > 0 && ni > op * 1.01) {
        // Net income es >1% mayor que operating income
        const ratio = otherIncome != null ? otherIncome / op : 0;

        if (otherIncome != null && ratio >= 0.10) {
            // Other income es >=10% del operating income
            const warningKey = 'net_income_boosted_by_nonoperating_income';
            w.push(warningKey);
            warnContext[warningKey] = {
                other_income: otherIncome,
                operating_income: op,
                net_income: ni,
                ratio_other_to_operating: ratio,
                threshold_used: 0.10,
                description: 'Net income exceeds operating income due to significant non-operating income'
            };
        } else {
            const warningKey = 'net_income_gt_operating_income_small_gap';
            w.push(warningKey);
            warnContext[warningKey] = {
                operating_income: op,
                net_income: ni,
                gap: ni - op,
                gap_percent: ((ni - op) / op) * 100
            };
        }
    }


    // ✅ NUEVO: Gap entre income_before_tax y operating_income no explicado
    if (incomeBeforeTax != null && op != null && op > 0) {
        const gap = incomeBeforeTax - op;
        const explained = (otherIncome || 0) + (interestIncome || 0) - (interestExpense || 0);
        const unexplained = gap - explained;

        // Si el gap no explicado es >5% del operating income
        if (Math.abs(unexplained) > op * 0.05) {
            const warningKey = 'pretax_vs_operating_gap_unexplained';
            w.push(warningKey);
            warnContext[warningKey] = {
                operating_income: op,
                income_before_tax: incomeBeforeTax,
                gap: gap,
                explained_by_other_interest: explained,
                unexplained: unexplained,
                unexplained_pct: (unexplained / op) * 100
            };
        }
    }

    return { warnings: w, warning_context: warnContext };
}

// ===========================
function getMonthName(month) {
    const names = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return names[month] || '';
}

// ===========================
// EXTRACT ALL FINANCIAL METRICS (P2)
// ===========================
function extractAllMetrics(facts, anchor) {
    const end = anchor.end;

    // ===========================
    // INCOME STATEMENT
    // ===========================
    const revenueItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.revenue, 'USD');
    const costOfRevenueItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.cost_of_revenue, 'USD');
    const grossProfitItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.gross_profit, 'USD');
    const rdItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.research_and_development, 'USD');
    const smItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.sales_and_marketing, 'USD');
    const gaItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.general_and_administrative, 'USD');
    const opExpensesItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.operating_expenses, 'USD');
    const opIncomeItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.operating_income, 'USD');
    const interestExpenseItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.interest_expense, 'USD');
    const interestIncomeItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.interest_income, 'USD');
    const otherIncomeItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.other_income, 'USD');
    const incomeBeforeTaxItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.income_before_tax, 'USD');
    const incomeTaxItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.income_tax_expense, 'USD');
    const netIncomeItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.net_income, 'USD');
    const epsBasicItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.eps_basic, 'pure');
    const epsDilutedItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.eps_diluted, 'pure');

    // Extraer valores (flow metrics usan extractQuarterValue)
    const revenue = extractQuarterValue(revenueItems, anchor);
    const costOfRevenue = extractQuarterValue(costOfRevenueItems, anchor);
    let grossProfit = extractQuarterValue(grossProfitItems, anchor);
    const rd = extractQuarterValue(rdItems, anchor);
    const sm = extractQuarterValue(smItems, anchor);
    const ga = extractQuarterValue(gaItems, anchor);
    let opExpenses = extractQuarterValue(opExpensesItems, anchor);
    const opIncome = extractQuarterValue(opIncomeItems, anchor);
    const interestExpense = extractQuarterValue(interestExpenseItems, anchor);
    const interestIncome = extractQuarterValue(interestIncomeItems, anchor);
    const otherIncome = extractQuarterValue(otherIncomeItems, anchor);
    const incomeBeforeTax = extractQuarterValue(incomeBeforeTaxItems, anchor);
    const incomeTax = extractQuarterValue(incomeTaxItems, anchor);
    const netIncome = extractQuarterValue(netIncomeItems, anchor);
    const epsBasic = extractQuarterValue(epsBasicItems, anchor);
    const epsDiluted = extractQuarterValue(epsDilutedItems, anchor);

    // Calcular gross profit si falta
    if (!grossProfit && revenue?.value != null && costOfRevenue?.value != null) {
        grossProfit = {
            value: revenue.value - costOfRevenue.value,
            computed: true,
            method: 'revenue_minus_cogs'
        };
    }

    // Calcular operating expenses si falta
    if (!opExpenses && rd?.value != null && sm?.value != null && ga?.value != null) {
        opExpenses = {
            value: (rd.value || 0) + (sm.value || 0) + (ga.value || 0),
            computed: true,
            method: 'sum_rd_sm_ga'
        };
    }

    // ✅ NUEVO: Validar si operating_expenses es en realidad total_costs
    const totalCostsItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.total_costs_and_expenses, 'USD');
    const totalCosts = extractQuarterValue(totalCostsItems, anchor);

    if (opExpenses?.value != null && costOfRevenue?.value != null && totalCosts?.value != null) {
        // Si opExpenses está cerca de totalCosts, entonces está mal mapeado
        const diff = Math.abs(opExpenses.value - totalCosts.value);

        if (diff / totalCosts.value < 0.01) {
            // opExpenses es en realidad totalCosts, recalcular
            const trueOpex = totalCosts.value - (costOfRevenue.value || 0);
            opExpenses = {
                value: trueOpex,
                computed: true,
                method: 'total_costs_minus_cogs'
            };
        }
    }

    // ===========================
    // BALANCE SHEET
    // ===========================
    const cashItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.cash_and_equivalents, 'USD');
    const stInvItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.short_term_investments, 'USD');
    const arItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.accounts_receivable, 'USD');
    const inventoryItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.inventory, 'USD');
    const prepaidItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.prepaid_expenses, 'USD');
    const otherCurrentAssetsItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.other_current_assets, 'USD');
    const currentAssetsItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.current_assets, 'USD');
    const ppeItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.property_plant_equipment, 'USD');
    const goodwillItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.goodwill, 'USD');
    const intangiblesItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.intangible_assets, 'USD');
    const ltInvItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.long_term_investments, 'USD');
    const otherNoncurrentAssetsItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.other_noncurrent_assets, 'USD');
    const noncurrentAssetsItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.noncurrent_assets, 'USD');
    const totalAssetsItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.total_assets, 'USD');

    const apItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.accounts_payable, 'USD');
    const stDebtItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.short_term_debt, 'USD');
    const accruedItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.accrued_liabilities, 'USD');
    const deferredRevCurrentItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.deferred_revenue_current, 'USD');
    const otherCurrentLiabItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.other_current_liabilities, 'USD');
    const currentLiabItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.current_liabilities, 'USD');
    const ltDebtItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.long_term_debt, 'USD');
    const deferredTaxItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.deferred_tax, 'USD');
    const deferredRevNoncurrentItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.deferred_revenue_noncurrent, 'USD');
    const otherNoncurrentLiabItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.other_noncurrent_liabilities, 'USD');
    const noncurrentLiabItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.noncurrent_liabilities, 'USD');
    const totalLiabItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.total_liabilities, 'USD');

    const commonStockItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.common_stock, 'USD');
    const apicItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.additional_paid_in_capital, 'USD');
    const retainedEarningsItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.retained_earnings, 'USD');
    const treasuryItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.treasury_stock, 'USD');
    const aociItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.accumulated_other_comprehensive_income, 'USD');
    const totalEquityItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.total_equity, 'USD');

    // Balance sheet values (point-in-time, usar pickByEndBest)
    const cash = pickByEndBest(cashItems, end);
    const stInv = pickByEndBest(stInvItems, end);
    const ar = pickByEndBest(arItems, end);
    const inventory = pickByEndBest(inventoryItems, end);
    const prepaid = pickByEndBest(prepaidItems, end);
    const otherCurrentAssets = pickByEndBest(otherCurrentAssetsItems, end);
    const currentAssets = pickByEndBest(currentAssetsItems, end);
    const ppe = pickByEndBest(ppeItems, end);
    const goodwill = pickByEndBest(goodwillItems, end);
    const intangibles = pickByEndBest(intangiblesItems, end);
    const ltInv = pickByEndBest(ltInvItems, end);
    const otherNoncurrentAssets = pickByEndBest(otherNoncurrentAssetsItems, end);
    const noncurrentAssets = pickByEndBest(noncurrentAssetsItems, end);
    const totalAssets = pickByEndBest(totalAssetsItems, end);

    const ap = pickByEndBest(apItems, end);
    const stDebt = pickByEndBest(stDebtItems, end);
    const accrued = pickByEndBest(accruedItems, end);
    const deferredRevCurrent = pickByEndBest(deferredRevCurrentItems, end);
    const otherCurrentLiab = pickByEndBest(otherCurrentLiabItems, end);
    const currentLiab = pickByEndBest(currentLiabItems, end);
    const ltDebt = pickByEndBest(ltDebtItems, end);
    const deferredTax = pickByEndBest(deferredTaxItems, end);
    const deferredRevNoncurrent = pickByEndBest(deferredRevNoncurrentItems, end);
    const otherNoncurrentLiab = pickByEndBest(otherNoncurrentLiabItems, end);
    const noncurrentLiab = pickByEndBest(noncurrentLiabItems, end);
    const totalLiab = pickByEndBest(totalLiabItems, end);

    const commonStock = pickByEndBest(commonStockItems, end);
    const apic = pickByEndBest(apicItems, end);
    const retainedEarnings = pickByEndBest(retainedEarningsItems, end);
    const treasury = pickByEndBest(treasuryItems, end);
    const aoci = pickByEndBest(aociItems, end);
    const totalEquity = pickByEndBest(totalEquityItems, end);

    // ===========================
    // CASH FLOW STATEMENT
    // ===========================
    const depAmortItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.depreciation_amortization, 'USD');
    const sbcItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.stock_based_compensation, 'USD');
    const wcItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.changes_in_working_capital, 'USD');
    const deferredTaxCFItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.deferred_income_tax, 'USD');
    const otherOpActivitiesItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.other_operating_activities, 'USD');
    const ocfItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.operating_cash_flow, 'USD');
    const capexItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.capex, 'USD');
    const acquisitionsItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.acquisitions, 'USD');
    const purchInvItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.purchases_of_investments, 'USD');
    const salesInvItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.sales_of_investments, 'USD');
    const otherInvActivitiesItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.other_investing_activities, 'USD');
    const icfItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.investing_cash_flow, 'USD');
    const debtIssuedItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.debt_issued, 'USD');
    const debtRepaidItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.debt_repaid, 'USD');
    const dividendsItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.dividends_paid, 'USD');
    const stockRepurchItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.stock_repurchased, 'USD');
    const stockIssuedItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.stock_issued, 'USD');
    const otherFinActivitiesItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.other_financing_activities, 'USD');
    const fcfItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.financing_cash_flow, 'USD');
    const netChangeItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.net_change_in_cash, 'USD');

    const depAmort = extractQuarterValue(depAmortItems, anchor);
    const sbc = extractQuarterValue(sbcItems, anchor);
    const wc = extractQuarterValue(wcItems, anchor);
    const deferredTaxCF = extractQuarterValue(deferredTaxCFItems, anchor);
    const otherOpActivities = extractQuarterValue(otherOpActivitiesItems, anchor);
    const ocf = extractQuarterValue(ocfItems, anchor);
    const capexAbs = extractQuarterValue(capexItems, anchor);
    const capex = capexAbs?.value != null ? { ...capexAbs, value: -Math.abs(capexAbs.value) } : capexAbs;
    const acquisitions = extractQuarterValue(acquisitionsItems, anchor);
    const purchInv = extractQuarterValue(purchInvItems, anchor);
    const salesInv = extractQuarterValue(salesInvItems, anchor);
    const otherInvActivities = extractQuarterValue(otherInvActivitiesItems, anchor);
    const icf = extractQuarterValue(icfItems, anchor);
    const debtIssued = extractQuarterValue(debtIssuedItems, anchor);
    const debtRepaid = extractQuarterValue(debtRepaidItems, anchor);
    const dividends = extractQuarterValue(dividendsItems, anchor);
    const stockRepurch = extractQuarterValue(stockRepurchItems, anchor);
    const stockIssued = extractQuarterValue(stockIssuedItems, anchor);
    const otherFinActivities = extractQuarterValue(otherFinActivitiesItems, anchor);
    const fcf = extractQuarterValue(fcfItems, anchor);
    const netChange = extractQuarterValue(netChangeItems, anchor);

    // ===========================
    // SHARES
    // ===========================
    const dilutedSharesItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.diluted_shares, 'shares');
    const basicSharesItems = extractFirstAvailable(facts, CONCEPT_MAPPINGS.basic_shares, 'shares');
    const dilutedShares = pickByEndBest(dilutedSharesItems, end);
    const basicShares = pickByEndBest(basicSharesItems, end);

    // Calcular Free Cash Flow si no existe
    let freeCashFlow = null;
    if (ocf?.value != null && capex?.value != null) {
        freeCashFlow = {
            value: ocf.value + capex.value,
            computed: true,
            method: 'ocf_plus_capex'
        };
    }

    return {
        income: {
            revenue: revenue?.value ?? null,
            cost_of_revenue: costOfRevenue?.value ?? null,
            gross_profit: grossProfit?.value ?? null,
            research_and_development: rd?.value ?? null,
            sales_and_marketing: sm?.value ?? null,
            general_and_administrative: ga?.value ?? null,
            operating_expenses: opExpenses?.value ?? null,
            operating_income: opIncome?.value ?? null,
            interest_expense: interestExpense?.value ?? null,
            interest_income: interestIncome?.value ?? null,
            other_income: otherIncome?.value ?? null,
            income_before_tax: incomeBeforeTax?.value ?? null,
            income_tax_expense: incomeTax?.value ?? null,
            net_income: netIncome?.value ?? null,
            eps_basic: epsBasic?.value ?? null,
            eps_diluted: epsDiluted?.value ?? null
        },
        balance: {
            cash_and_equivalents: cash?.value ?? null,
            short_term_investments: stInv?.value ?? null,
            accounts_receivable: ar?.value ?? null,
            inventory: inventory?.value ?? null,
            prepaid_expenses: prepaid?.value ?? null,
            other_current_assets: otherCurrentAssets?.value ?? null,
            current_assets: currentAssets?.value ?? null,
            property_plant_equipment: ppe?.value ?? null,
            goodwill: goodwill?.value ?? null,
            intangible_assets: intangibles?.value ?? null,
            long_term_investments: ltInv?.value ?? null,
            other_noncurrent_assets: otherNoncurrentAssets?.value ?? null,
            noncurrent_assets: noncurrentAssets?.value ?? null,
            total_assets: totalAssets?.value ?? null,
            accounts_payable: ap?.value ?? null,
            short_term_debt: stDebt?.value ?? null,
            accrued_liabilities: accrued?.value ?? null,
            deferred_revenue_current: deferredRevCurrent?.value ?? null,
            other_current_liabilities: otherCurrentLiab?.value ?? null,
            current_liabilities: currentLiab?.value ?? null,
            long_term_debt: ltDebt?.value ?? null,
            deferred_tax: deferredTax?.value ?? null,
            deferred_revenue_noncurrent: deferredRevNoncurrent?.value ?? null,
            other_noncurrent_liabilities: otherNoncurrentLiab?.value ?? null,
            noncurrent_liabilities: noncurrentLiab?.value ?? null,
            total_liabilities: totalLiab?.value ?? null,
            common_stock: commonStock?.value ?? null,
            additional_paid_in_capital: apic?.value ?? null,
            retained_earnings: retainedEarnings?.value ?? null,
            treasury_stock: treasury?.value ?? null,
            accumulated_other_comprehensive_income: aoci?.value ?? null,
            total_equity: totalEquity?.value ?? null
        },
        cashflow: {
            net_income_cf: netIncome?.value ?? null,
            depreciation_amortization: depAmort?.value ?? null,
            stock_based_compensation: sbc?.value ?? null,
            changes_in_working_capital: wc?.value ?? null,
            deferred_income_tax: deferredTaxCF?.value ?? null,
            other_operating_activities: otherOpActivities?.value ?? null,
            operating_cash_flow: ocf?.value ?? null,
            capex: capex?.value ?? null,
            acquisitions: acquisitions?.value ?? null,
            purchases_of_investments: purchInv?.value ?? null,
            sales_of_investments: salesInv?.value ?? null,
            other_investing_activities: otherInvActivities?.value ?? null,
            investing_cash_flow: icf?.value ?? null,
            debt_issued: debtIssued?.value ?? null,
            debt_repaid: debtRepaid?.value ?? null,
            dividends_paid: dividends?.value ?? null,
            stock_repurchased: stockRepurch?.value ?? null,
            stock_issued: stockIssued?.value ?? null,
            other_financing_activities: otherFinActivities?.value ?? null,
            financing_cash_flow: fcf?.value ?? null,
            net_change_in_cash: netChange?.value ?? null,
            free_cash_flow: freeCashFlow?.value ?? null
        },
        shares: {
            diluted: dilutedShares?.value ?? null,
            basic: basicShares?.value ?? null
        },
        computed_fields: {
            gross_profit: grossProfit?.computed || false,
            operating_expenses: opExpenses?.computed || false,
            operating_income: opIncome?.computed || false,
            net_income: netIncome?.computed || false,
            ocf: ocf?.computed || false,
            capex: capex?.computed || false,
            free_cash_flow: freeCashFlow?.computed || false
        }
    };
}

// ===========================
// EXTRACT SERIES WITH FYE FROM SUBMISSIONS
// ===========================
async function extractSeriesFromCompanyFacts(ticker, companyFactsJson, limit = 16) {
    const facts = companyFactsJson?.facts?.['us-gaap'] ?? {};
    const cik10 = padCik10(companyFactsJson?.cik);

    const revCandidates = CONCEPT_MAPPINGS.revenue;
    let bestRevenue = { key: null, items: [], maxEnd: null };
    for (const k of revCandidates) {
        const items = extractFirstAvailable(facts, [k], 'USD') || [];
        const maxEnd = items.map(x => x?.end).filter(Boolean).sort().at(-1) || null;

        if (!bestRevenue.maxEnd || (maxEnd && maxEnd > bestRevenue.maxEnd)) {
            bestRevenue = { key: k, items, maxEnd };
        }
    }


    let revenueItems = bestRevenue.items || [];
    console.log(`Revenue items selected: ${revenueItems.length}`);
    let anchorItems = revenueItems.length
        ? revenueItems
        : (extractFirstAvailable(facts, CONCEPT_MAPPINGS.net_income, 'USD') || []);
    console.log(`Anchor items selected: ${anchorItems.length} (source: ${revenueItems.length ? 'revenue' : 'net_income'})`);
    const latestEndAll = anchorItems
        .map(x => x?.end)
        .filter(Boolean)
        .sort()
        .at(-1);

    console.log(`Latest end date available:`, latestEndAll);
    console.log(`Total anchor items BEFORE filter:`, anchorItems.length);

    const anchors = selectAnchorsRobust(anchorItems, { max: Math.max(1, limit) });

    console.log(`Total anchors AFTER selectAnchorsRobust:`, anchors.length);



    if (!anchors.length) {
        return { series: [], latestEndAll };
    }

    console.log(`Processing ${anchors.length} anchors/quarters`);

    // 🆕 FIX 1: Usar FYE desde SEC Submissions
    let fiscalYearEndMonth = await getFiscalYearEndMonth(cik10);

    if (!fiscalYearEndMonth) {
        console.warn(`[CompanyFacts] Could not fetch FYE from submissions for CIK ${cik10}, falling back to detection`);
        fiscalYearEndMonth = detectFiscalYearEnd(anchorItems);
    }

    console.log(`Fiscal year end month: ${fiscalYearEndMonth} (${getMonthName(fiscalYearEndMonth)})`);

    // Construir bundles
    const series = anchors.map(anchor => {
        console.log(`Processing quarter ${anchor.fp} FY${anchor.fy} end ${anchor.end}`);

        const derivedPeriod = deriveFiscalPeriod(anchor.end, fiscalYearEndMonth);

        // ✅ validateFilingDelta ya tiene el orden correcto: (end, filed)
        const deltaRaw = anchor.filed ? validateFilingDelta(anchor.end, anchor.filed) : null;

        // 🆕 FIX 2: Nullear filing_date si delta > 90 días (probable duplicación de fecha)
        const deltaDays = (deltaRaw !== null && Math.abs(deltaRaw) > 90) ? null : deltaRaw;
        const filingDate = deltaDays !== null ? anchor.filed : null;

        const filingWarnings = [];

        if (deltaDays !== null) {
            if (deltaDays < 0) {
                filingWarnings.push('filing_before_quarter_end');
            } else if (deltaDays > 60) {
                filingWarnings.push(`filing_delayed_${deltaDays}_days`);
            }
        }

        const metrics = extractAllMetrics(facts, anchor);

        const bundle = {
            ticker: ticker.toUpperCase(),
            period: {
                period_id: derivedPeriod.period_id,
                quarter_end_date: anchor.end,
                filing_date: filingDate,
                currency: 'USD',
                scaling: 'raw',
                fiscal_year: derivedPeriod.fiscal_year,
                fiscal_quarter: derivedPeriod.fiscal_quarter,
                fiscal_year_end_month: fiscalYearEndMonth,
                delta_days_filing: deltaDays
            },
            sources: [
                {
                    doc_type: 'sec_companyfacts',
                    url: `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik10}.json`
                }
            ],
            reported: metrics,
            warnings: [],
            _debug: {
                anchor: {
                    end: anchor.end,
                    fy: anchor.fy,
                    fp: anchor.fp,
                    form: anchor.form,
                    filed: anchor.filed
                },
                derived_period: derivedPeriod,
                sec_period: {
                    fy: anchor.fy,
                    fp: anchor.fp,
                    period_id: buildPeriodId(anchor)
                },
                period_match: derivedPeriod.period_id === buildPeriodId(anchor),
                computed_fields: metrics.computed_fields
            }
        };

        // ✅ Usar validateBundle con context
        const validation = validateBundle(bundle);
        bundle.warnings = [...validation.warnings, ...filingWarnings];

        if (Object.keys(validation.warning_context).length > 0) {
            bundle.warning_context = validation.warning_context;
        }

        if (!bundle._debug.period_match) {
            bundle.warnings.push('period_id_mismatch_sec_vs_derived');
        }

        return bundle;
    });

    // Ordenar desc por quarter_end_date
    series.sort((a, b) => (a.period.quarter_end_date < b.period.quarter_end_date ? 1 : -1));

    // Deduplicate por period_id
    const seen = new Set();
    const deduped = [];
    for (const b of series) {
        const pid = b?.period?.period_id || `${b?.period?.quarter_end_date}`;
        if (seen.has(pid)) continue;
        seen.add(pid);
        deduped.push(b);
    }

    // AGREGAR COMPUTED METRICS (TTM, YoY, QoQ, Margins, Ratios)
    console.log(`Adding computed metrics (TTM, YoY, QoQ, margins, ratios)...`);

    const enrichedSeries = deduped.map((bundle, index) => {
        console.log(`[DEBUG] Processing bundle ${index + 1}/${deduped.length} - ${bundle.period?.period_id}`);
        return addComputedMetrics(bundle, deduped, index);

    });

    console.log('[DEBUG] ✅ All bundles processed');
    console.log('[DEBUG] ✅ enrichedSeries.length:', enrichedSeries.length);
    console.log('[DEBUG] ✅ enrichedSeries[0]?.period?.period_id:', enrichedSeries[0]?.period?.period_id);
    console.log('[DEBUG] ✅ About to return from extractSeriesFromCompanyFacts');

    return { series: enrichedSeries, latestEndAll };
}


module.exports = {
    normalizeSymbol,
    resolveCikFromTicker,
    fetchCompanyFacts,
    extractSeriesFromCompanyFacts,
};
