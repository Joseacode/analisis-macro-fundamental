// server/services/inlineXbrlParser.cjs

function stripTags(s) {
    return String(s ?? "").replace(/<[^>]*>/g, "").trim();
}

function parseNumberText(txt) {
    const t = String(txt ?? "").trim();
    if (!t) return null;

    // Negativos estilo (123)
    const neg = /^\(.*\)$/.test(t);
    const cleaned = t
        .replace(/[,$\s]/g, "")
        .replace(/^\(/, "")
        .replace(/\)$/, "")
        .replace(/−/g, "-"); // minus unicode

    const n = Number(cleaned);
    if (!Number.isFinite(n)) return null;
    return neg ? -n : n;
}

/**
 * Parse contexts: <xbrli:context id="..."> ... (startDate/endDate OR instant)
 */
function parseContexts(html) {
    const ctxMap = new Map();

    const ctxRegex = /<xbrli:context\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/xbrli:context>/gi;
    let m;
    while ((m = ctxRegex.exec(html))) {
        const id = m[1];
        const body = m[2];

        const start = (body.match(/<xbrli:startDate>([^<]+)<\/xbrli:startDate>/i) || [])[1] || null;
        const end = (body.match(/<xbrli:endDate>([^<]+)<\/xbrli:endDate>/i) || [])[1] || null;
        const instant = (body.match(/<xbrli:instant>([^<]+)<\/xbrli:instant>/i) || [])[1] || null;

        // Guardamos solo lo útil
        ctxMap.set(id, {
            id,
            startDate: start,
            endDate: end,
            instant,
            // Heurística: duration vs instant
            kind: end ? "duration" : instant ? "instant" : "unknown",
        });
    }

    return ctxMap;
}

/**
 * Parse facts de Inline XBRL:
 * - <ix:nonFraction ...>VALUE</ix:nonFraction> (números)
 * - <ix:nonNumeric ...>TEXT</ix:nonNumeric> (strings)
 */
function parseFacts(html) {
    const facts = [];

    const factRegex = /<ix:(nonFraction|nonNumeric)\b([^>]*)>([\s\S]*?)<\/ix:\1>/gi;
    let m;
    while ((m = factRegex.exec(html))) {
        const kind = m[1];
        const attrsRaw = m[2] || "";
        const inner = m[3] || "";

        const name = (attrsRaw.match(/\bname="([^"]+)"/i) || [])[1] || null;
        const contextRef = (attrsRaw.match(/\bcontextRef="([^"]+)"/i) || [])[1] || null;
        const unitRef = (attrsRaw.match(/\bunitRef="([^"]+)"/i) || [])[1] || null;

        // scale/decimals a veces aparecen; no siempre
        const scale = (attrsRaw.match(/\bscale="([^"]+)"/i) || [])[1] || null;
        const decimals = (attrsRaw.match(/\bdecimals="([^"]+)"/i) || [])[1] || null;

        const textValue = stripTags(inner);

        facts.push({
            kind,
            name,
            contextRef,
            unitRef,
            scale,
            decimals,
            rawText: textValue,
            num: kind === "nonFraction" ? parseNumberText(textValue) : null,
        });
    }

    return facts;
}

/**
 * Elige el "period end" más reciente de los contexts duration.
 * (para income/cash flow, normalmente coincide con quarter end)
 */
function pickLatestDurationEndDate(ctxMap) {
    const dates = [];
    for (const c of ctxMap.values()) {
        if (c.kind === "duration" && c.endDate) dates.push(c.endDate);
    }
    dates.sort(); // ISO string comparable
    return dates.length ? dates[dates.length - 1] : null;
}

/**
 * Utility: filtrar facts por nombre(s) y por endDate seleccionado
 * ✅ NUEVO: Busca con namespace flexible (us-gaap: o custom como msft:)
 */
function findFactNumber(facts, ctxMap, names, periodEnd) {
    const nameSet = new Set(names.map(String));

    // ✅ Crear variantes con diferentes namespaces
    const allVariants = new Set();
    for (const name of nameSet) {
        allVariants.add(name); // us-gaap:Revenues

        // Si tiene namespace, agregar versión sin namespace
        if (name.includes(':')) {
            const [ns, local] = name.split(':');
            allVariants.add(local); // Revenues
            allVariants.add(`msft:${local}`); // msft:Revenues
            allVariants.add(`us-gaap:${local}`); // us-gaap:Revenues (por si acaso)
        }
    }

    // 1) Primero: duration con endDate == periodEnd
    for (const f of facts) {
        if (!f.name) continue;
        if (f.num == null) continue;

        // ✅ Match flexible: buscar por local name o full name
        const localName = f.name.includes(':') ? f.name.split(':')[1] : f.name;
        const matches = allVariants.has(f.name) || allVariants.has(localName);

        if (!matches) continue;

        const ctx = f.contextRef ? ctxMap.get(f.contextRef) : null;
        if (ctx?.kind === "duration" && ctx.endDate === periodEnd) return f.num;
    }

    // 2) Fallback: cualquier duration (la más reciente que aparezca)
    for (const f of facts) {
        if (!f.name) continue;
        if (f.num == null) continue;

        const localName = f.name.includes(':') ? f.name.split(':')[1] : f.name;
        const matches = allVariants.has(f.name) || allVariants.has(localName);

        if (!matches) continue;

        const ctx = f.contextRef ? ctxMap.get(f.contextRef) : null;
        if (ctx?.kind === "duration") return f.num;
    }

    return null;
}

function findFactInstantNumber(facts, ctxMap, names, instantDate) {
    const nameSet = new Set(names.map(String));

    // ✅ Crear variantes con diferentes namespaces
    const allVariants = new Set();
    for (const name of nameSet) {
        allVariants.add(name);

        if (name.includes(':')) {
            const [ns, local] = name.split(':');
            allVariants.add(local);
            allVariants.add(`msft:${local}`);
            allVariants.add(`us-gaap:${local}`);
        }
    }

    // 1) instant exacto
    for (const f of facts) {
        if (!f.name) continue;
        if (f.num == null) continue;

        const localName = f.name.includes(':') ? f.name.split(':')[1] : f.name;
        const matches = allVariants.has(f.name) || allVariants.has(localName);

        if (!matches) continue;

        const ctx = f.contextRef ? ctxMap.get(f.contextRef) : null;
        if (ctx?.kind === "instant" && ctx.instant === instantDate) return f.num;
    }

    // 2) fallback: cualquier instant
    for (const f of facts) {
        if (!f.name) continue;
        if (f.num == null) continue;

        const localName = f.name.includes(':') ? f.name.split(':')[1] : f.name;
        const matches = allVariants.has(f.name) || allVariants.has(localName);

        if (!matches) continue;

        const ctx = f.contextRef ? ctxMap.get(f.contextRef) : null;
        if (ctx?.kind === "instant") return f.num;
    }

    return null;
}

/**
 * Normaliza montos a "million" si vienen gigantes (USD).
 * Esto te mantiene consistente con tu bundle mock.
 */
function normalizeMoneyToMillion(x) {
    if (x == null) return { value: null, scaling: "million" };
    const abs = Math.abs(x);
    if (abs >= 1e9) return { value: x / 1e6, scaling: "million" }; // 1,000,000,000 => 1,000 million
    if (abs >= 1e6) return { value: x / 1e6, scaling: "million" }; // en la práctica también
    return { value: x, scaling: "raw" };
}

function normalizeSharesToThousands(x) {
    if (x == null) return { value: null, scaling: "thousand" };
    const abs = Math.abs(x);
    if (abs >= 1e6) return { value: x / 1e3, scaling: "thousand" };
    return { value: x, scaling: "raw" };
}

/**
 * EXTRA: arma un bundle mínimo desde Inline XBRL para tu MVP
 */
function extractBundleFromInlineXbrl({ ticker, filingDate, html }) {
    const ctxMap = parseContexts(html);
    const facts = parseFacts(html);
    const periodEnd = pickLatestDurationEndDate(ctxMap);

    // Income statement
    const revenueRaw = findFactNumber(facts, ctxMap, ["us-gaap:Revenues", "us-gaap:SalesRevenueNet", "us-gaap:RevenueFromContractWithCustomerExcludingAssessedTax"], periodEnd);
    const grossProfitRaw = findFactNumber(facts, ctxMap, ["us-gaap:GrossProfit"], periodEnd);
    const opIncomeRaw = findFactNumber(facts, ctxMap, ["us-gaap:OperatingIncomeLoss"], periodEnd);
    const netIncomeRaw = findFactNumber(facts, ctxMap, ["us-gaap:NetIncomeLoss", "us-gaap:ProfitLoss"], periodEnd);

    // Cash flow
    const ocfRaw = findFactNumber(
        facts,
        ctxMap,
        ["us-gaap:NetCashProvidedByUsedInOperatingActivities"],
        periodEnd
    );

    const capexRaw = findFactNumber(
        facts,
        ctxMap,
        [
            "us-gaap:PaymentsToAcquirePropertyPlantAndEquipment",
            "us-gaap:PaymentsToAcquireProductiveAssets",
        ],
        periodEnd
    );

    // Shares (duration)
    const dilutedSharesRaw = findFactNumber(
        facts,
        ctxMap,
        ["us-gaap:WeightedAverageNumberOfDilutedSharesOutstanding"],
        periodEnd
    );

    const basicSharesRaw = findFactNumber(
        facts,
        ctxMap,
        ["us-gaap:WeightedAverageNumberOfSharesOutstandingBasic"],
        periodEnd
    );

    // Balance sheet instants: usamos instantDate = periodEnd si existe
    const cashRaw = periodEnd
        ? findFactInstantNumber(
            facts,
            ctxMap,
            ["us-gaap:CashAndCashEquivalentsAtCarryingValue", "us-gaap:Cash"],
            periodEnd
        )
        : null;

    const stInvRaw = periodEnd
        ? findFactInstantNumber(
            facts,
            ctxMap,
            ["us-gaap:AvailableForSaleSecuritiesCurrent", "us-gaap:ShortTermInvestments"],
            periodEnd
        )
        : null;

    const assetsRaw = periodEnd
        ? findFactInstantNumber(facts, ctxMap, ["us-gaap:Assets"], periodEnd)
        : null;

    const currentAssetsRaw = periodEnd
        ? findFactInstantNumber(facts, ctxMap, ["us-gaap:AssetsCurrent"], periodEnd)
        : null;

    // Normalización de escala
    const rev = normalizeMoneyToMillion(revenueRaw);
    const gp = normalizeMoneyToMillion(grossProfitRaw);
    const op = normalizeMoneyToMillion(opIncomeRaw);
    const ni = normalizeMoneyToMillion(netIncomeRaw);

    const ocf = normalizeMoneyToMillion(ocfRaw);
    const capex = normalizeMoneyToMillion(capexRaw);

    const cash = normalizeMoneyToMillion(cashRaw);
    const stInv = normalizeMoneyToMillion(stInvRaw);
    const assets = normalizeMoneyToMillion(assetsRaw);
    const currentAssets = normalizeMoneyToMillion(currentAssetsRaw);

    const dSh = normalizeSharesToThousands(dilutedSharesRaw);
    const bSh = normalizeSharesToThousands(basicSharesRaw);

    // Elegimos scaling principal (siempre million en MVP)
    const scaling = "million";

    return {
        ticker,
        period: {
            period_id: periodEnd ? `PERIOD_END_${periodEnd}` : null,
            quarter_end_date: periodEnd,
            filing_date: filingDate,
            currency: "USD",
            scaling,
        },
        sources: [
            { doc_type: "sec_primary_document", url: "sec://inline-xbrl" }
        ],
        reported: {
            income: {
                revenue: rev.value,
                gross_profit: gp.value,
                operating_income: op.value,
                net_income: ni.value,
            },
            balance: {
                total_assets: assets.value,
                current_assets: currentAssets.value,
                cash_and_equivalents: cash.value,
                short_term_investments: stInv.value,
            },
            cashflow: {
                operating_cash_flow: ocf.value,
                capex: capex.value,
            },
            shares: {
                diluted: dSh.value,
                basic: bSh.value,
            },
        },
        adjusted: {
            income: {
                revenue: rev.value,
                gross_profit: gp.value,
                operating_income: op.value,
                net_income: ni.value,
            },
        },
        adjustments: [],
        _debug: {
            periodEndPicked: periodEnd,
            counts: { contexts: ctxMap.size, facts: facts.length },
        },
    };
}

module.exports = {
    extractBundleFromInlineXbrl,
};
