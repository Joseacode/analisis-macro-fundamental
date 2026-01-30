import fetch from "node-fetch";

/**
 * Descubre el documento de earnings más reciente
 * NO parsea números todavía.
 */
async function discoverEarningsSource(ticker) {
    const symbol = ticker.toUpperCase();

    // Placeholder (por ahora)
    return {
        ticker: symbol,
        discoveredAt: new Date().toISOString(),

        sourcePriority: [
            "earnings_release",
            "10-Q / 10-K",
            "8-K"
        ],

        selectedSource: null,

        documents: {
            earnings_release: null,
            tenQ: null,
            tenK: null,
            eightK: null
        },

        status: "not_implemented"
    };
}

module.exports = {
    discoverEarningsSource
};
