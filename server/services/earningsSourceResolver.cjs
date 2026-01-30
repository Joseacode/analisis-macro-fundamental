// server/services/earningsSourceResolver.cjs

/**
 * Decide qué documento usar para análisis cuantitativo
 * basándose en frescura y tipo.
 */
function resolveEarningsSource(secDiscovery) {
    if (!secDiscovery?.ok || !Array.isArray(secDiscovery.filings)) {
        return { status: "no_filings", selected: null, reason: null, available: {} };
    }

    const filings = secDiscovery.filings;

    const tenQ = filings.find((f) => f.form === "10-Q") ?? null;
    const tenK = filings.find((f) => f.form === "10-K") ?? null;
    const eightK = filings.find((f) => f.form === "8-K") ?? null;

    /**
     * PRIORIDAD
     * 1) 8-K (earnings release suele venir ahí como Exhibit 99.1)
     * 2) 10-Q (quarterly report)
     * 3) 10-K (annual report)
     */
    let selected = null;
    let reason = null;

    if (eightK) {
        selected = eightK;
        reason = "8-K (often contains earnings release as Exhibit 99.1)";
    } else if (tenQ) {
        selected = tenQ;
        reason = "10-Q quarterly report";
    } else if (tenK) {
        selected = tenK;
        reason = "10-K annual report";
    }

    return {
        status: selected ? "ok" : "not_found",
        selected,
        reason,
        available: {
            tenQ: !!tenQ,
            tenK: !!tenK,
            eightK: !!eightK,
        },
    };
}

module.exports = {
    resolveEarningsSource,
};
