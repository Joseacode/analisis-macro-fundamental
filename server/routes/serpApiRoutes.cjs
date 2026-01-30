// server/routes/serpApiRoutes.cjs

const express = require('express');
const router = express.Router();
const { getJson } = require('serpapi');
require('dotenv').config();

const SERPAPI_KEY = process.env.SERPAPI_KEY;

if (!SERPAPI_KEY) {
    console.warn('⚠️  SERPAPI_KEY not found in .env file');
}

/**
 * GET /api/serpapi/stock/:ticker
 * Obtiene info completa de Google Finance para un ticker
 */
router.get('/stock/:ticker', async (req, res) => {
    try {
        const { ticker } = req.params;
        const { exchange = 'NASDAQ' } = req.query;

        if (!SERPAPI_KEY) {
            return res.status(503).json({
                error: 'SerpApi not configured',
                message: 'Set SERPAPI_KEY in .env to enable this feature'
            });
        }

        getJson({
            engine: 'google_finance',
            q: `${ticker}:${exchange}`,
            api_key: SERPAPI_KEY
        }, (json) => {
            if (json.error) {
                return res.status(400).json({ error: json.error });
            }

            // Extract relevant data
            const enrichedData = {
                summary: json.summary,
                keyEvents: json.key_events || [],
                news: json.news || [],
                graph: json.graph || [],
                sentiment: json.knowledge_graph?.key_stats?.tags || [],
                relatedStocks: json.discover_more || [],
                financials: json.financials || []
            };

            res.json(enrichedData);
        });
    } catch (error) {
        console.error('SerpApi stock error:', error);
        res.status(500).json({ error: 'Failed to fetch data from Google Finance' });
    }
});

/**
 * GET /api/serpapi/news/:ticker
 * Obtiene solo las noticias de un ticker (más rápido y optimizado)
 */
router.get('/news/:ticker', async (req, res) => {
    try {
        const { ticker } = req.params;
        const { limit = 10, exchange = 'NASDAQ' } = req.query;

        if (!SERPAPI_KEY) {
            return res.status(503).json({
                error: 'SerpApi not configured',
                message: 'Set SERPAPI_KEY in .env to enable this feature'
            });
        }

        getJson({
            engine: 'google_finance',
            q: `${ticker}:${exchange}`,
            api_key: SERPAPI_KEY
        }, (json) => {
            if (json.error) {
                return res.status(400).json({ error: json.error });
            }

            // Extraer y formatear noticias
            const newsArray = json.news || [];
            const formatted = newsArray.slice(0, parseInt(limit)).flatMap(section => {
                if (section.items && Array.isArray(section.items)) {
                    return section.items.map(item => ({
                        title: item.snippet || item.title || section.title,
                        link: item.link,
                        source: item.source,
                        date: item.date,
                        thumbnail: item.thumbnail,
                        category: section.title
                    }));
                }
                // Si no tiene items, puede ser una noticia directa
                if (section.link) {
                    return [{
                        title: section.title,
                        link: section.link,
                        source: section.source,
                        date: section.date,
                        thumbnail: section.thumbnail,
                        category: 'General'
                    }];
                }
                return [];
            });

            res.json({
                ticker: ticker.toUpperCase(),
                count: formatted.length,
                news: formatted
            });
        });

    } catch (error) {
        console.error('SerpApi news error:', error);
        res.status(500).json({ error: 'Failed to fetch news' });
    }
});

/**
 * GET /api/serpapi/trending
 * Obtiene trending stocks del mercado
 */
router.get('/trending', async (req, res) => {
    try {
        if (!SERPAPI_KEY) {
            return res.status(503).json({
                error: 'SerpApi not configured',
                message: 'Set SERPAPI_KEY in .env to enable this feature'
            });
        }

        getJson({
            engine: 'google_finance_markets',
            trend: 'most-active',
            api_key: SERPAPI_KEY
        }, (json) => {
            if (json.error) {
                return res.status(400).json({ error: json.error });
            }

            const trending = {
                markets: json.market_trends || [],
                topGainers: json.top_gainers || [],
                topLosers: json.top_losers || [],
                mostActive: json.most_active || []
            };

            res.json(trending);
        });

    } catch (error) {
        console.error('SerpApi trending error:', error);
        res.status(500).json({ error: 'Failed to fetch trending data' });
    }
});

/**
 * GET /api/serpapi/market-news
 * Obtiene noticias generales del mercado (no ticker-specific)
 */
router.get('/market-news', async (req, res) => {
    try {
        const { limit = 20 } = req.query;

        if (!SERPAPI_KEY) {
            return res.status(503).json({
                error: 'SerpApi not configured',
                message: 'Set SERPAPI_KEY in .env to enable this feature'
            });
        }

        // Buscar noticias de "stock market news" usando Google News
        getJson({
            engine: 'google',
            q: 'stock market news',
            tbm: 'nws', // News tab
            num: parseInt(limit),
            api_key: SERPAPI_KEY
        }, (json) => {
            if (json.error) {
                return res.status(400).json({ error: json.error });
            }

            const newsResults = json.news_results || [];
            const formatted = newsResults.map(item => ({
                title: item.title,
                link: item.link,
                source: item.source,
                date: item.date,
                thumbnail: item.thumbnail,
                snippet: item.snippet
            }));

            res.json({
                count: formatted.length,
                news: formatted
            });
        });

    } catch (error) {
        console.error('SerpApi market news error:', error);
        res.status(500).json({ error: 'Failed to fetch market news' });
    }
});

/**
 * GET /api/serpapi/key-events/:ticker
 * Obtiene solo los key events de un ticker (para timeline)
 */
router.get('/key-events/:ticker', async (req, res) => {
    try {
        const { ticker } = req.params;
        const { exchange = 'NASDAQ' } = req.query;

        if (!SERPAPI_KEY) {
            return res.status(503).json({
                error: 'SerpApi not configured',
                message: 'Set SERPAPI_KEY in .env to enable this feature'
            });
        }

        getJson({
            engine: 'google_finance',
            q: `${ticker}:${exchange}`,
            api_key: SERPAPI_KEY
        }, (json) => {
            if (json.error) {
                return res.status(400).json({ error: json.error });
            }

            const keyEvents = (json.key_events || []).map(event => ({
                date: event.date,
                title: event.title,
                description: event.snippet,
                type: event.type || 'event'
            }));

            res.json({
                ticker: ticker.toUpperCase(),
                count: keyEvents.length,
                events: keyEvents
            });
        });

    } catch (error) {
        console.error('SerpApi key events error:', error);
        res.status(500).json({ error: 'Failed to fetch key events' });
    }
});

module.exports = router;
