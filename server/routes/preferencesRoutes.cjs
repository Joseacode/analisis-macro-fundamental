// server/routes/preferencesRoutes.cjs

const express = require('express');
const router = express.Router();
const fs = require('fs/promises');
const path = require('path');

const PREFERENCES_FILE = path.join(__dirname, '../data/preferences.json');

async function ensureDataDir() {
    const dir = path.dirname(PREFERENCES_FILE);
    try {
        await fs.access(dir);
    } catch {
        await fs.mkdir(dir, { recursive: true });
    }
}

const DEFAULT_PREFERENCES = {
    watchlist: ['AAPL', 'MSFT', 'GOOGL'],
    favoriteSectors: ['XLK', 'XLF', 'XLV'],
    notifications: {
        enabled: true,
        priceChangeThreshold: 5,
        scoreMinThreshold: 85,
        earningsReminder: true,
        macroAlerts: true
    },
    scoring: {
        valueWeight: 25,
        qualityWeight: 35,
        growthWeight: 25,
        riskWeight: 15
    },
    display: {
        decimals: 1,
        density: 'normal',
        theme: 'dark',
        showBenchmark: true
    },
    dataRefreshInterval: 15,
    autoSaveDossier: true
};

// GET /api/preferences
router.get('/', async (req, res) => {
    try {
        await ensureDataDir();
        const data = await fs.readFile(PREFERENCES_FILE, 'utf-8');
        res.json(JSON.parse(data));
    } catch (error) {
        // Return defaults if file doesn't exist
        res.json(DEFAULT_PREFERENCES);
    }
});

// POST /api/preferences
router.post('/', async (req, res) => {
    try {
        await ensureDataDir();
        await fs.writeFile(PREFERENCES_FILE, JSON.stringify(req.body, null, 2));
        console.log('✅ Preferences saved:', req.body.watchlist);
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving preferences:', error);
        res.status(500).json({ error: 'Failed to save preferences' });
    }
});

module.exports = router;
