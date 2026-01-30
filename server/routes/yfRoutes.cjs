// server/routes/yfRoutes.cjs
const path = require("path");
const fs = require("fs/promises");
const crypto = require("crypto");

// ✅ Importar CLASE + instancia
const YahooFinance = require("yahoo-finance2").default;

const yahooFinance = new YahooFinance({
    suppressNotices: ["yahooSurvey"],
});

// ----------------- cache dirs -----------------
const CACHE_DIR = path.resolve(__dirname, "..", ".cache", "yf");
fs.mkdir(CACHE_DIR, { recursive: true }).catch(() => { });

// ---------------- utils ----------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function sha1(s) {
    return crypto.createHash("sha1").update(s).digest("hex");
}

async function readCacheJson(file, ttlMs) {
    try {
        const st = await fs.stat(file);
        if (Date.now() - st.mtimeMs > ttlMs) return null;
        const txt = await fs.readFile(file, "utf-8");
        return JSON.parse(txt);
    } catch {
        return null;
    }
}

async function writeCacheJson(file, data) {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(data, null, 2), "utf-8");
}

function stripHtml(s) {
    return String(s ?? "")
        .replace(/<[^>]*>/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, " ")
        .trim();
}

function toRawNumber(v) {
    if (v == null) return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    if (typeof v === "string") {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    }
    if (typeof v === "object" && v && "raw" in v) {
        const n = Number(v.raw);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

function toPct(v) {
    const n = toRawNumber(v);
    if (n == null) return null;
    if (Math.abs(n) <= 1) return Math.round(n * 10000) / 100;
    return Math.round(n * 100) / 100;
}

function normalizeSymbolForYahoo(sym) {
    return String(sym).toUpperCase().replace(/\./g, "-").trim();
}

async function mapLimit(items, limit, fn) {
    const out = new Array(items.length);
    let i = 0;
    const workers = new Array(Math.min(limit, items.length))
        .fill(0)
        .map(async () => {
            while (true) {
                const idx = i++;
                if (idx >= items.length) break;
                out[idx] = await fn(items[idx]);
            }
        });
    await Promise.all(workers);
    return out;
}

// ---------------- S&P500 (Wikipedia) ----------------
const SP500_TTL = 7 * 24 * 60 * 60 * 1000;
const SP500_CACHE_FILE = path.join(CACHE_DIR, "sp500.json");
const WIKI_URL = "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies";

async function fetchSp500FromWiki() {
    const res = await fetch(WIKI_URL, {
        headers: {
            "User-Agent": "institutional-macro-dashboard/1.0 (sp500 educational fetch)",
            Accept: "text/html",
        },
    });

    if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Wiki SP500 fetch failed: ${res.status} ${txt.slice(0, 120)}`);
    }

    const html = await res.text();

    // Buscar la primera tabla wikitable
    const tableMatch = html.match(/<table[^>]*class="wikitable[^"]*"[\s\S]*?<\/table>/i);
    if (!tableMatch) throw new Error("No pude encontrar la tabla de SP500 en Wikipedia.");

    const table = tableMatch[0];

    // Nueva regex: buscar filas con <a> tags que contienen los símbolos
    const items = [];

    // Buscar todas las filas <tr>
    const rows = table.match(/<tr[\s\S]*?<\/tr>/gi) || [];

    for (const row of rows) {
        // Saltar header rows
        if (row.includes('<th')) continue;

        // Extraer celdas <td>
        const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
        if (cells.length < 3) continue;

        // Primera celda tiene el símbolo (dentro de un link)
        const symbolMatch = cells[0].match(/>([\w.-]+)</);
        if (!symbolMatch) continue;

        const symbol = symbolMatch[1].trim();

        // Validar que sea un símbolo válido (letras, números, puntos, guiones)
        if (!/^[A-Z0-9.-]+$/i.test(symbol)) continue;

        // Segunda celda tiene el nombre de la compañía
        const name = stripHtml(cells[1]);

        // Tercera celda tiene el sector GICS
        const gicsSector = cells.length > 2 ? stripHtml(cells[2]) : null;

        // Cuarta celda tiene la sub-industria
        const subIndustry = cells.length > 3 ? stripHtml(cells[3]) : null;

        items.push({
            symbol,
            name: name || null,
            gicsSector: gicsSector || null,
            subIndustry: subIndustry || null,
        });
    }

    if (!items.length) {
        throw new Error("Parse SP500 vacío. La tabla de Wikipedia cambió de formato.");
    }

    console.log(`✓ Parseados ${items.length} símbolos del S&P 500 desde Wikipedia`);
    return items;
}


async function getSp500() {
    const cached = await readCacheJson(SP500_CACHE_FILE, SP500_TTL);
    if (cached?.items?.length) return cached;

    const items = await fetchSp500FromWiki();
    const payload = { asOf: new Date().toISOString().slice(0, 10), items };
    await writeCacheJson(SP500_CACHE_FILE, payload);
    return payload;
}

// ---------------- Snapshot cache ----------------
const SNAP_TTL = 10 * 60 * 1000;
const snapCache = new Map();

function snapGet(key) {
    const hit = snapCache.get(key);
    if (!hit) return null;
    if (Date.now() - hit.t > SNAP_TTL) {
        snapCache.delete(key);
        return null;
    }
    return hit.v;
}

function snapSet(key, v) {
    snapCache.set(key, { t: Date.now(), v });
}

// server/routes/yfRoutes.cjs - función getSnapshot()

async function getSnapshot(symbol) {
    const sym = normalizeSymbolForYahoo(symbol);
    const key = `snap:${sym}`;
    const cached = snapGet(key);
    if (cached) return cached;

    const qs = await yahooFinance.quoteSummary(sym, {
        modules: [
            "price",
            "summaryDetail",
            "defaultKeyStatistics",
            "financialData",
            "assetProfile"
        ],
    });

    const price = qs?.price ?? {};
    const summaryDetail = qs?.summaryDetail ?? {};
    const dks = qs?.defaultKeyStatistics ?? {};
    const fin = qs?.financialData ?? {};
    const profile = qs?.assetProfile ?? {};

    const snap = {
        symbol: sym,
        ticker: sym,
        name: price?.longName ?? price?.shortName ?? null,
        price: toRawNumber(price?.regularMarketPrice),
        currency: price?.currency ?? null,
        marketCap: toRawNumber(price?.marketCap),

        sector: profile?.sector ?? null,
        industry: profile?.industry ?? null,  // ✅ YA ESTABA - Solo asegurate que esté
        subIndustry: profile?.industry ?? null,  // ✅ Yahoo no tiene subIndustry separado

        beta: toRawNumber(dks?.beta ?? summaryDetail?.beta),

        pe: toRawNumber(summaryDetail?.trailingPE ?? dks?.trailingPE),
        pb: toRawNumber(dks?.priceToBook),
        ps: toRawNumber(dks?.priceToSalesTrailing12Months),
        evEbitda: toRawNumber(dks?.enterpriseToEbitda),

        roe: toPct(fin?.returnOnEquity),
        grossMargin: toPct(fin?.grossMargins),
        operatingMargin: toPct(fin?.operatingMargins),
        netMargin: toPct(summaryDetail?.profitMargins ?? fin?.profitMargins),

        revenueGrowthYoY: toPct(fin?.revenueGrowth),
        epsGrowthYoY: toPct(fin?.earningsGrowth),
        epsTTM: toRawNumber(dks?.trailingEps),

        debtToEquity: toRawNumber(fin?.debtToEquity),
        currentRatio: toRawNumber(fin?.currentRatio),

        asOf: new Date().toISOString().slice(0, 10),
        source: "YAHOO",
    };

    snapSet(key, snap);
    return snap;
}


// ---------------- sector mapping ----------------
const SECTOR_MAP = {
    XLK: "Information Technology",
    XLY: "Consumer Discretionary",
    XLI: "Industrials",
    XLF: "Financials",
    XLE: "Energy",
    XLB: "Materials",
    XLV: "Health Care",
    XLP: "Consumer Staples",
    XLU: "Utilities",
    XLC: "Communication Services",
    XLRE: "Real Estate",
};

// ---------------- routes ----------------
function registerYfRoutes(app) {
    console.log("✓ Rutas YF registradas");

    app.get("/api/yf/_debug", (_req, res) => {
        res.json({
            ok: true,
            hasQuoteSummary: typeof yahooFinance?.quoteSummary === "function",
            cacheSize: snapCache.size,
            time: new Date().toISOString(),
        });
    });

    app.get("/api/yf/sp500", async (_req, res) => {
        try {
            const data = await getSp500();
            res.json({
                count: data.items.length,
                asOf: data.asOf,
                items: data.items,
                source: "WIKI"
            });
        } catch (e) {
            console.error("✗ ERROR en SP500:", e.message);
            res.status(500).json({ error: "SP500 error", detail: String(e?.message ?? e) });
        }
    });

    app.get("/api/yf/sp500/top/:count", async (req, res) => {
        try {
            const count = Math.max(1, Math.min(100, Number(req.params.count ?? 50)));
            const concurrency = Math.max(1, Math.min(10, Number(req.query.concurrency ?? 4)));

            const data = await getSp500();
            const symbols = data.items.slice(0, count).map(x => x.symbol);

            console.log(`  📊 Procesando top ${symbols.length} del S&P 500...`);

            const snaps = await mapLimit(symbols, concurrency, async (sym) => {
                try {
                    await sleep(50);
                    const s = await getSnapshot(sym);
                    return s;
                } catch (err) {
                    console.error(`    ⚠️ Error en ${sym}:`, err.message);
                    return null;
                }
            });

            const items = snaps.filter(Boolean);

            console.log(`  ✓ Obtenidos ${items.length}/${symbols.length} símbolos`);

            res.json({
                count: items.length,
                requested: symbols.length,
                items,
                asOf: new Date().toISOString().slice(0, 10),
                source: "YAHOO",
            });
        } catch (e) {
            console.error("✗ ERROR en SP500 top:", e.message);
            res.status(500).json({ error: "SP500 top error", detail: String(e?.message ?? e) });
        }
    });

    app.get("/api/yf/snapshot/:symbol", async (req, res) => {
        try {
            const snap = await getSnapshot(req.params.symbol);
            res.json(snap);
        } catch (e) {
            console.error("✗ ERROR en snapshot:", e.message);
            res.status(500).json({ error: "Snapshot error", detail: String(e?.message ?? e) });
        }
    });

    app.get("/api/yf/sector/:sectorKey", async (req, res) => {
        try {
            const sectorKey = String(req.params.sectorKey).toUpperCase();
            const top = Math.max(1, Math.min(50, Number(req.query.top ?? 15)));
            const concurrency = Math.max(1, Math.min(10, Number(req.query.concurrency ?? 4)));

            const sectorName = SECTOR_MAP[sectorKey] ?? null;
            if (!sectorName) {
                return res.status(400).json({
                    error: `Sector inválido: ${sectorKey}`,
                    available: Object.keys(SECTOR_MAP)
                });
            }

            const sp = await getSp500();

            // ✅ Filtrar empresas del sector
            const companies = sp.items
                .filter((x) => String(x.gicsSector ?? "").toLowerCase() === sectorName.toLowerCase())
                .slice(0, top);

            const symbols = companies.map((x) => x.symbol);

            console.log(`  📊 Procesando ${symbols.length} símbolos del sector ${sectorKey}...`);

            const snaps = await mapLimit(symbols, concurrency, async (sym) => {
                try {
                    await sleep(50);
                    const s = await getSnapshot(sym);

                    // ✅ IMPORTANTE: Enriquecer con datos de Wikipedia
                    const companyInfo = companies.find(c => normalizeSymbolForYahoo(c.symbol) === sym);

                    return {
                        ...s,
                        sector: companyInfo?.gicsSector ?? s.sector ?? sectorName,
                        subIndustry: companyInfo?.subIndustry ?? s.subIndustry ?? null  // ✅ Priorizar Wikipedia
                    };
                } catch (err) {
                    console.error(`    ⚠️ Error en ${sym}:`, err.message);
                    return null;
                }
            });

            const items = snaps.filter(Boolean);

            console.log(`  ✓ Obtenidos ${items.length}/${symbols.length} símbolos`);

            res.json({
                sector: sectorKey,
                sectorName,
                count: items.length,
                requested: symbols.length,
                items,
                asOf: new Date().toISOString().slice(0, 10),
                source: "YAHOO",
            });
        } catch (e) {
            console.error("✗ ERROR en sector:", e.message);
            res.status(500).json({ error: "Sector error", detail: String(e?.message ?? e) });
        }
    });

    // ============== NUEVO: Endpoint para obtener empresas comparables ==============
    // GET /api/yf/comparables/:symbol
    // Devuelve solo las empresas de la MISMA sub-industria que el símbolo dado
    app.get("/api/yf/comparables/:symbol", async (req, res) => {
        try {
            const symbol = normalizeSymbolForYahoo(req.params.symbol);
            const limit = Math.max(1, Math.min(50, Number(req.query.limit ?? 20)));
            const concurrency = Math.max(1, Math.min(10, Number(req.query.concurrency ?? 5)));

            const sp = await getSp500();

            // Encontrar la empresa objetivo
            const targetCompany = sp.items.find(x =>
                normalizeSymbolForYahoo(x.symbol) === symbol
            );

            if (!targetCompany) {
                return res.status(404).json({
                    error: `${symbol} no encontrado en S&P 500`
                });
            }

            if (!targetCompany.subIndustry) {
                return res.status(400).json({
                    error: `${symbol} no tiene sub-industria definida`,
                    company: targetCompany
                });
            }

            // Filtrar SOLO empresas de la MISMA sub-industria (excluyendo la target)
            const comparables = sp.items.filter(x =>
                x.subIndustry === targetCompany.subIndustry &&
                normalizeSymbolForYahoo(x.symbol) !== symbol
            ).slice(0, limit);

            // Si no hay comparables, devolver info útil
            if (comparables.length === 0) {
                return res.json({
                    target: {
                        symbol: targetCompany.symbol,
                        name: targetCompany.name,
                        gicsSector: targetCompany.gicsSector,
                        subIndustry: targetCompany.subIndustry
                    },
                    comparables: [],
                    message: `No hay otras empresas en la sub-industria "${targetCompany.subIndustry}" dentro del S&P 500`,
                    asOf: new Date().toISOString().slice(0, 10)
                });
            }

            // Obtener snapshots solo de las comparables (sin incluir target para ahorrar tiempo)
            const symbols = comparables.map(x => x.symbol);

            const snaps = await mapLimit(symbols, concurrency, async (sym) => {
                try {
                    await sleep(25);
                    const s = await getSnapshot(sym);
                    const companyInfo = comparables.find(c => c.symbol === sym);

                    // ✅ DEVOLVER TODOS LOS DATOS del snapshot
                    return {
                        ...s,  // ← ESTO ES LO IMPORTANTE: incluye price, pe, pb, roe, etc.
                        ticker: s.symbol,
                        subIndustry: companyInfo.subIndustry,
                        gicsSector: companyInfo.gicsSector
                    };
                } catch (err) {
                    // Si falla Yahoo Finance, devolver al menos la info básica
                    const companyInfo = comparables.find(c => c.symbol === sym);
                    return {
                        symbol: companyInfo.symbol,
                        ticker: companyInfo.symbol,
                        name: companyInfo.name,
                        subIndustry: companyInfo.subIndustry,
                        gicsSector: companyInfo.gicsSector,
                        error: "No se pudo obtener datos financieros"
                    };
                }
            });


            const validSnaps = snaps.filter(Boolean);

            res.json({
                target: {
                    symbol: targetCompany.symbol,
                    name: targetCompany.name,
                    gicsSector: targetCompany.gicsSector,
                    subIndustry: targetCompany.subIndustry
                },
                comparables: validSnaps,
                totalComparables: validSnaps.length,
                subIndustry: targetCompany.subIndustry,
                gicsSector: targetCompany.gicsSector,
                asOf: new Date().toISOString().slice(0, 10),
                source: "WIKI+YAHOO"
            });
        } catch (e) {
            res.status(500).json({ error: String(e?.message ?? e) });
        }
    });

    // ============== NUEVO: Endpoint auxiliar para debug ==============
    // GET /api/yf/subindustries
    // Lista todas las sub-industrias disponibles en el S&P 500
    app.get("/api/yf/subindustries", async (_req, res) => {
        try {
            const sp = await getSp500();

            // Agrupar por sub-industria
            const subIndustryMap = {};

            sp.items.forEach(item => {
                const subInd = item.subIndustry || "Unknown";
                const sector = item.gicsSector || "Unknown";

                if (!subIndustryMap[subInd]) {
                    subIndustryMap[subInd] = {
                        subIndustry: subInd,
                        gicsSector: sector,
                        count: 0,
                        companies: []
                    };
                }

                subIndustryMap[subInd].count++;
                subIndustryMap[subInd].companies.push({
                    symbol: item.symbol,
                    name: item.name
                });
            });

            // Convertir a array y ordenar por cantidad de empresas
            const result = Object.values(subIndustryMap)
                .sort((a, b) => b.count - a.count);

            res.json({
                totalSubIndustries: result.length,
                subIndustries: result,
                asOf: new Date().toISOString().slice(0, 10),
                source: "WIKI"
            });
        } catch (e) {
            res.status(500).json({ error: String(e?.message ?? e) });
        }
    });

    // ✅ NUEVO: Búsqueda global en todos los sectores
    // ✅ NUEVO: Búsqueda global en todos los sectores
    app.get("/api/yf/search", async (req, res) => {
        try {
            const query = req.query.q;

            if (!query || typeof query !== 'string' || query.length < 2) {
                return res.json({ items: [], count: 0 });
            }

            const sp = await getSp500();
            const searchTerm = query.toLowerCase().trim();

            // Buscar por ticker o nombre
            const results = sp.items.filter((company) => {
                const tickerMatch = company.symbol.toLowerCase().includes(searchTerm);
                const nameMatch = company.name.toLowerCase().includes(searchTerm);
                return tickerMatch || nameMatch;
            });

            // Limitar a 50 resultados máximo
            const limited = results.slice(0, 50);
            const concurrency = 5;

            console.log(`  🔍 Búsqueda: "${query}" → ${limited.length} resultados`);

            // Enriquecer con datos de Yahoo Finance
            const enriched = await mapLimit(limited, concurrency, async (company) => {
                try {
                    await sleep(50);
                    const snap = await getSnapshot(company.symbol);

                    // ✅ PRIORIZAR datos de Wikipedia (más precisos para GICS)
                    return {
                        ...snap,
                        subIndustry: company.subIndustry ?? snap.subIndustry ?? null,  // ✅ Wikipedia primero
                        sector: company.gicsSector ?? snap.sector ?? null,
                    };
                } catch (err) {
                    console.warn(`    ⚠️ Search skip ${company.symbol}:`, err.message);
                    // Devolver datos básicos si falla Yahoo Finance
                    return {
                        ticker: company.symbol,
                        symbol: company.symbol,
                        name: company.name,
                        sector: company.gicsSector,
                        subIndustry: company.subIndustry,  // ✅ Desde Wikipedia
                        price: null,
                        marketCap: null,
                        beta: null,
                        pe: null,
                        ps: null,
                        pb: null,
                        evEbitda: null,
                        roe: null,
                        operatingMargin: null,
                        grossMargin: null,
                        netMargin: null,
                        revenueGrowthYoY: null,
                        epsGrowthYoY: null,
                        debtToEquity: null,
                        currentRatio: null,
                        epsTTM: null,
                        asOf: new Date().toISOString().slice(0, 10),
                        source: "WIKI",
                    };
                }
            });

            const items = enriched.filter((x) => x !== null);

            console.log(`  ✓ Búsqueda completada: ${items.length} empresas enriquecidas`);

            res.json({
                items,
                count: items.length,
                total: results.length,
                query: query,
                asOf: new Date().toISOString().slice(0, 10),
                source: "WIKI+YAHOO",
            });
        } catch (err) {
            console.error("✗ ERROR en búsqueda:", err);
            res.status(500).json({ error: err.message });
        }
    });


}



module.exports = { registerYfRoutes };
