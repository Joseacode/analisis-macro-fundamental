// server/routes/yahooEarnings.cjs

const YahooFinance = require("yahoo-finance2").default;

const yahooFinance = new YahooFinance({
    suppressNotices: ["yahooSurvey"],
});

const {
    toRawNumber,
    safeRatio,
    safeGrowth,
    marginDeltaPP,
    epochToISODate,

} = require("./earningsRoutes.cjs/");

const {
    normalizeSymbolForYahoo
} = require("../routes/yfRoutes.cjs");


async function getEarningsSnapshot(symbol, lookback = 5) {
    const sym = normalizeSymbolForYahoo(symbol);
    const lb = Math.max(2, Math.min(12, Number(lookback) || 5));


    return payload;
}
module.exports = {
    getEarningsSnapshot
};
