/**
 * secCompanyFacts.cjs
 * SEC XBRL Company Facts API wrapper
 * Extracts quarterly financial data from SEC CompanyFacts JSON
 */

const path = require('path');
const fs = require('fs/promises');

// ===========================
// 🆕 IMPORT FISCAL PERIOD DERIVER
// ===========================
const {
    deriveFiscalPeriod,
    validateFilingDelta,
    detectFiscalYearEnd
} = require('./fiscalPeriodDeriver.cjs');

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

/**
 * Detecta si un item es YTD (Year-To-Date)
 */
function isYTD(item) {
    const fp = String(item?.fp ?? '').toUpperCase();
    // Solo Q1-Q4 pueden ser YTD
    if (!['Q1', 'Q2', 'Q3', 'Q4'].includes(fp)) return false;

    // Si tiene start/end, calcular duración
    const days = daysBetween(item?.start, item?.end);
    if (days != null) {
        // Si > 110 días, es YTD
        return days > 110;
    }

    // Si NO tiene start, asumir que es YTD
    return !item?.start;
}

/**
 * Valida que un item sea un quarter real (80-110 días)
 */
function isQuarterLike(item) {
    const fp = String(item?.fp ?? '').toUpperCase();

    // 1) Debe ser Q1-Q4
    if (!['Q1', 'Q2', 'Q3', 'Q4'].includes(fp)) return false;

    // 2) CRÍTICO: Rechazar si NO tiene start
    if (!item?.start) {
        console.log(`❌ isQuarterLike: Rejected (no start) fp=${fp}, end=${item?.end}, val=${item?.value}`);
        return false;
    }

    // 3) Validar duración estricta
    const days = daysBetween(item.start, item.end);

    // Si no se puede calcular días, rechazar
    if (days === null || isNaN(days)) {
        console.log(`❌ isQuarterLike: Rejected (invalid days) fp=${fp}, start=${item.start}, end=${item.end}`);
        return false;
    }

    // 4) DEBUG: Mostrar TODOS los items que llegan aquí
    const isValid = days >= 80 && days <= 110;
    if (isValid) {
        console.log(`✅ isQuarterLike: ACCEPTED fp=${fp}, days=${days}, end=${item.end}, val=${item.value}`);
    } else {
        console.log(`❌ isQuarterLike: Rejected (duration) fp=${fp}, days=${days}, end=${item.end}, val=${item.value}`);
    }

    return isValid;
}

/**
 * Calcula valor quarterly desde YTD por resta aritmética
 */
function computeQuarterlyDelta(allItems, anchor) {
    const { end, fy, fp } = anchor;
    console.log(`computeQuarterlyDelta: fp=${fp} FY${fy} end=${end}`);

    // Q1 nunca necesita resta (es el primer quarter del año fiscal)
    if (fp === 'Q1') {
        const q1Items = allItems.filter(x => x?.end === end && x?.fy === fy && x?.fp === 'Q1' && x?.value != null);
        const result = q1Items.sort((a, b) => (String(a.filed) > String(b.filed) ? -1 : 1))[0] || null;
        console.log(`Q1 direct value:`, result?.value);
        return result;
    }

    // Buscar el YTD del quarter actual
    const ytdCandidates = allItems.filter(x => x?.end === end && x?.fy === fy && x?.fp === fp && x?.value != null);
    console.log(`YTD current candidates:`, ytdCandidates.length);

    // Preferir YTD explícito, sino tomar el primero
    const ytdCurrent = ytdCandidates.find(isYTD) || ytdCandidates.sort((a, b) => (String(a.filed) > String(b.filed) ? -1 : 1))[0];

    if (!ytdCurrent) {
        console.warn(`No YTD found for ${fp} FY${fy}`);
        return null;
    }

    console.log(`YTD current:`, ytdCurrent.value, `has start:`, !!ytdCurrent.start);

    // Mapeo de quarters previos
    const prevFpMap = { Q2: 'Q1', Q3: 'Q2', Q4: 'Q3' };
    const prevFp = prevFpMap[fp];

    // Buscar el YTD del quarter anterior (mismo año fiscal)
    const ytdPrevCandidates = allItems.filter(x => x?.fy === fy && x?.fp === prevFp && x?.value != null);
    console.log(`YTD prev candidates (${prevFp}):`, ytdPrevCandidates.length);

    const ytdPrev = ytdPrevCandidates.sort((a, b) => (String(a.filed) > String(b.filed) ? -1 : 1))[0];

    if (!ytdPrev) {
        console.warn(`No prev YTD found for ${fp} FY${fy}, using current YTD as-is`);
        return ytdCurrent;
    }

    console.log(`YTD prev:`, ytdPrev.value);

    // RESTA ARITMÉTICA
    const computed = ytdCurrent.value - ytdPrev.value;
    console.log(`COMPUTED ${fp} FY${fy}:`, `${ytdCurrent.value} - ${ytdPrev.value} =`, computed);

    return {
        value: computed,
        start: ytdPrev.end, // Aproximación: start = end del quarter previo
        end: ytdCurrent.end,
        filed: ytdCurrent.filed,
        form: ytdCurrent.form,
        fp: ytdCurrent.fp,
        fy: ytdCurrent.fy,
        frame: ytdCurrent.frame,
        unit: ytdCurrent.unit,
        computed: true,
        method: 'ytd_delta',
        ytd_current: ytdCurrent.value,
        ytd_previous: ytdPrev.value
    };
}

/**
 * Extrae valor de quarter con fallback a YTD delta
 */
function extractQuarterValue(allItems, anchor) {
    // PASO 1: Buscar quarter directo (80-110 días)
    const quarterItems = allItems.filter(isQuarterLike);
    const directMatch = quarterItems.filter(x =>
        x?.end === anchor.end &&
        x?.fy === anchor.fy &&
        x?.fp === anchor.fp &&
        x?.value != null
    );

    if (directMatch.length > 0) {
        const result = directMatch.sort((a, b) => (String(a.filed) > String(b.filed) ? -1 : 1))[0];
        console.log(`✅ Found direct quarter for ${anchor.fp} FY${anchor.fy}:`, result.value);
        return result;
    }

    // PASO 2: Si no hay quarter directo, calcular desde YTD
    console.log(`⚠️ No direct quarter found, computing from YTD for ${anchor.fp} FY${anchor.fy}`);
    const result = computeQuarterlyDelta(allItems, anchor);
    return result;
}

// ===========================
// PICKING HELPERS
// ===========================
function pickByEndBest(items, end) {
    const list = items
        .filter(x => x?.end === end && x.value != null);

    if (!list.length) return null;

    list.sort((a, b) => (String(a.filed) > String(b.filed) ? -1 : 1));
    return list[0];
}

function pickByEndStartBest(items, anchor) {
    const end = anchor?.end;
    const start = anchor?.start;

    if (!start) return pickByEndBest(items, end);

    const list = items
        .filter(x => x?.end === end && x?.start === start && x.value != null);

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

function uniqueByEndPickBest(items) {
    const byEnd = new Map();

    const scoreForm = (form) => {
        const f = String(form ?? '').toUpperCase();
        if (f === '10-Q') return 3;
        if (f === '10-K') return 2;
        if (f === '8-K') return 1;
        return 0;
    };

    for (const it of items) {
        if (!it?.end || it.value === null) continue;

        const prev = byEnd.get(it.end);
        if (!prev) {
            byEnd.set(it.end, it);
            continue;
        }

        const filedA = String(it.filed);
        const filedB = String(prev.filed);

        if (filedA > filedB) {
            byEnd.set(it.end, it);
        } else if (filedA === filedB && scoreForm(it.form) > scoreForm(prev.form)) {
            byEnd.set(it.end, it);
        }
    }

    return [...byEnd.values()].sort((a, b) => (a.end > b.end ? -1 : 1));
}

function validateBundle(bundle) {
    const w = [];

    const r = bundle?.reported?.income?.revenue ?? null;
    const op = bundle?.reported?.income?.operating_income ?? null;
    const ni = bundle?.reported?.income?.net_income ?? null;

    if (r === null || r <= 0) w.push('revenue_missing_or_non_positive');
    if (!bundle?.period?.period_id) w.push('period_id_missing');
    if (!bundle?.period?.quarter_end_date) w.push('quarter_end_date_missing');
    if (ni != null && op != null && ni > op) {
        w.push('net_income_gt_operating_income_possible_nonoperating_gains_or_mix');
    }

    return w;
}

// ===========================
// EXTRACT FACTS FROM UNITS
// ===========================
function extractFactItems(factObj, unitWanted) {
    if (!factObj?.units) return [];

    const units = factObj.units;
    const unitKeys = Object.keys(units);
    if (!unitKeys.length) return [];

    let pickUnitKey = null;
    if (unitWanted === 'USD') {
        pickUnitKey = unitKeys.find(k => k === 'USD') || unitKeys.find(k => k.startsWith('USD')) || unitKeys[0];
    } else {
        pickUnitKey = unitKeys.find(k => k === 'shares') || unitKeys.find(k => k.toLowerCase().includes('shares')) || unitKeys[0];
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

// ===========================
// 🆕 HELPER: NOMBRE DE MES
// ===========================
function getMonthName(month) {
    const names = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return names[month] || '';
}

// ===========================
// EXTRACT SERIES (MULTIPLE PERIODS)
// ===========================
function extractSeriesFromCompanyFacts(ticker, companyFactsJson, limit = 16) {
    const facts = companyFactsJson?.facts?.['us-gaap'] ?? {};

    // 1) Revenue anchor (CON ORDEN CORREGIDO)
    const revCandidates = [
        'RevenueFromContractWithCustomerExcludingAssessedTax',
        'RevenueFromContractWithCustomerIncludingAssessedTax',
        'SalesRevenueNet',
        'Revenues',
    ];

    let revenueItems = [];
    for (const k of revCandidates) {
        const items = extractFactItems(facts[k], 'USD');
        if (items?.length) {
            console.log(`Using revenue concept: ${k}`);
            revenueItems = items;
            break;
        }
    }

    let anchorItems = revenueItems?.length
        ? revenueItems
        : extractFactItems(facts.NetIncomeLoss, 'USD');

    // Calcular latestEndAll ANTES de filtrar (para debug)
    const latestEndAll = anchorItems
        .map(x => x?.end)
        .filter(Boolean)
        .sort()
        .at(-1);

    console.log(`Latest end date available:`, latestEndAll);
    console.log(`Total anchor items BEFORE filter:`, anchorItems.length);

    // 2) Solo quarters Q1-Q4 (filtrar FY y YTD)
    anchorItems = anchorItems.filter(isQuarterLike);
    console.log(`Total anchor items AFTER isQuarterLike filter:`, anchorItems.length);

    // 3) Un anchor por end (best filed/form) + limit
    const anchors = uniqueByEndPickBest(anchorItems).slice(0, Math.max(1, limit));

    if (!anchors.length) {
        return { series: [], latestEndAll };
    }

    console.log(`Processing ${anchors.length} anchors/quarters`);

    // ===========================
    // 🆕 DETECTAR FISCAL YEAR END
    // ===========================
    const fiscalYearEndMonth = detectFiscalYearEnd(anchorItems);
    console.log(`Detected fiscal year end month: ${fiscalYearEndMonth} (${getMonthName(fiscalYearEndMonth)})`);

    // 4) Pre-extraer listas (1 vez)
    const grossProfitItems = extractFactItems(facts.GrossProfit, 'USD');
    const costOfRevenueItems = extractFactItems(facts.CostOfRevenue, 'USD');
    const opIncomeItems = extractFactItems(facts.OperatingIncomeLoss, 'USD');
    const netIncomeItems = extractFactItems(facts.NetIncomeLoss, 'USD');
    const ocfItems = extractFactItems(facts.NetCashProvidedByUsedInOperatingActivities, 'USD');
    const capexItems = extractFactItems(facts.PaymentsToAcquirePropertyPlantAndEquipment, 'USD');
    const assetsItems = extractFactItems(facts.Assets, 'USD');
    const assetsCurrentItems = extractFactItems(facts.AssetsCurrent, 'USD');
    const cashItems = extractFactItems(facts.CashAndCashEquivalentsAtCarryingValue, 'USD');
    const stInvItems = extractFactItems(facts.AvailableForSaleSecuritiesCurrent, 'USD').length
        ? extractFactItems(facts.AvailableForSaleSecuritiesCurrent, 'USD')
        : extractFactItems(facts.ShortTermInvestments, 'USD');
    const dilutedSharesItems = extractFactItems(facts.WeightedAverageNumberOfDilutedSharesOutstanding, 'shares');
    const basicSharesItems = extractFactItems(facts.WeightedAverageNumberOfSharesOutstandingBasic, 'shares');

    const cik10 = padCik10(companyFactsJson?.cik);

    // 5) Construir bundles
    const series = anchors.map(anchor => {
        console.log(`Processing quarter ${anchor.fp} FY${anchor.fy} end ${anchor.end}`);

        const revenue = anchor;
        const end = anchor.end;

        // ===========================
        // 🆕 DERIVAR FISCAL PERIOD AUTOMÁTICO
        // ===========================
        const derivedPeriod = deriveFiscalPeriod(end, fiscalYearEndMonth);

        // ===========================
        // 🆕 VALIDAR DELTA DAYS
        // ===========================
        const deltaDays = validateFilingDelta(anchor.filed, end);
        const filingWarnings = [];

        if (deltaDays !== null) {
            if (deltaDays < 0) {
                filingWarnings.push('filing_before_quarter_end');
            } else if (deltaDays > 60) {
                filingWarnings.push(`filing_delayed_${deltaDays}_days`);
            }
        }

        // Gross profit
        let grossProfit = pickByEndStartBest(grossProfitItems, anchor);
        if (!grossProfit && grossProfit?.value === null) {
            const cost = pickByEndStartBest(costOfRevenueItems, anchor);
            if (revenue?.value != null && cost?.value != null) {
                grossProfit = {
                    ...revenue,
                    value: revenue.value - cost.value,
                    unit: 'USD'
                };
            }
        }

        // Income flows (APLICAR extractQuarterValue)
        const opIncome = extractQuarterValue(opIncomeItems, anchor);
        const netIncome = extractQuarterValue(netIncomeItems, anchor);

        // Cashflow (CRÍTICO: aplicar lógica YTD)
        const ocf = extractQuarterValue(ocfItems, anchor);
        const capexAbs = extractQuarterValue(capexItems, anchor);
        const capex = capexAbs?.value != null ? { ...capexAbs, value: -Math.abs(capexAbs.value) } : capexAbs;

        // Balance (stock → match por end exacto)
        const assets = pickByEndBest(assetsItems, end);
        const assetsCurrent = pickByEndBest(assetsCurrentItems, end);
        const cash = pickByEndBest(cashItems, end);
        const stInv = pickByEndBest(stInvItems, end);

        // Shares
        const dilutedShares = pickByEndBest(dilutedSharesItems, end);
        const basicShares = pickByEndBest(basicSharesItems, end);

        // ===========================
        // 🆕 BUNDLE CON PERIOD CANÓNICO
        // ===========================
        const bundle = {
            ticker: ticker.toUpperCase(),
            period: {
                // Usar el period_id derivado automáticamente
                period_id: derivedPeriod.period_id,
                quarter_end_date: end,
                filing_date: anchor.filed,
                currency: 'USD',
                scaling: 'raw',
                // 🆕 Metadata adicional
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
            reported: {
                income: {
                    revenue: revenue?.value ?? null,
                    gross_profit: grossProfit?.value ?? null,
                    operating_income: opIncome?.value ?? null,
                    net_income: netIncome?.value ?? null
                },
                balance: {
                    total_assets: assets?.value ?? null,
                    current_assets: assetsCurrent?.value ?? null,
                    cash_and_equivalents: cash?.value ?? null,
                    short_term_investments: stInv?.value ?? null
                },
                cashflow: {
                    operating_cash_flow: ocf?.value ?? null,
                    capex: capex?.value ?? null
                },
                shares: {
                    diluted: dilutedShares?.value ?? null,
                    basic: basicShares?.value ?? null
                }
            },
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
                computed_fields: {
                    operating_income: opIncome?.computed || false,
                    net_income: netIncome?.computed || false,
                    ocf: ocf?.computed || false,
                    capex: capex?.computed || false
                }
            }
        };

        // ===========================
        // 🆕 VALIDACIONES EXTENDIDAS
        // ===========================
        bundle.warnings = [...validateBundle(bundle), ...filingWarnings];

        // Agregar warning si derived period != SEC period
        if (!bundle._debug.period_match) {
            bundle.warnings.push('period_id_mismatch_sec_vs_derived');
        }

        return bundle;
    });

    // Orden desc por quarter_end_date
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

    return { series: deduped, latestEndAll };
}

// ===========================
// EXPORTS
// ===========================
module.exports = {
    normalizeSymbol,
    resolveCikFromTicker,
    fetchCompanyFacts,
    extractSeriesFromCompanyFacts,
};
