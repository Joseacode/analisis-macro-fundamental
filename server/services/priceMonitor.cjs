// server/services/priceMonitor.cjs

const cron = require('node-cron');
const fs = require('fs/promises');
const path = require('path');
const yahooFinance = require('yahoo-finance2').default;

const NOTIFICATIONS_FILE = path.join(__dirname, '../data/notifications.json');
const PREFERENCES_FILE = path.join(__dirname, '../data/preferences.json');

// Cache de precios anteriores
const priceCache = new Map();

/**
 * Detecta si el mercado US está abierto (NYSE/NASDAQ)
 * Horario: Lun-Vie, 9:30 AM - 4:00 PM ET
 */
function isMarketOpen() {
    const now = new Date();
    const ny = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));

    const day = ny.getDay(); // 0 = Sunday, 6 = Saturday
    const hour = ny.getHours();
    const minutes = ny.getMinutes();
    const time = hour * 60 + minutes;

    // Weekend
    if (day === 0 || day === 6) {
        return false;
    }

    // Market hours: 9:30 AM - 4:00 PM ET
    const marketOpen = 9 * 60 + 30;  // 9:30 AM
    const marketClose = 16 * 60;     // 4:00 PM

    return time >= marketOpen && time <= marketClose;
}

async function readNotifications() {
    try {
        const data = await fs.readFile(NOTIFICATIONS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

async function writeNotifications(notifications) {
    const dir = path.dirname(NOTIFICATIONS_FILE);
    try {
        await fs.access(dir);
    } catch {
        await fs.mkdir(dir, { recursive: true });
    }
    await fs.writeFile(NOTIFICATIONS_FILE, JSON.stringify(notifications, null, 2));
}

async function readPreferences() {
    try {
        const data = await fs.readFile(PREFERENCES_FILE, 'utf-8');
        return JSON.parse(data);
    } catch {
        return {
            watchlist: ['AAPL', 'MSFT', 'GOOGL'],
            notifications: {
                enabled: true,
                priceChangeThreshold: 5
            }
        };
    }
}

async function checkPriceAlerts() {
    try {
        // ✅ Verificar si el mercado está abierto
        if (!isMarketOpen()) {
            console.log('🌙 Market closed, skipping price check (will resume during market hours)');
            return;
        }

        const prefs = await readPreferences();

        if (!prefs.notifications?.enabled) {
            console.log('⏸️  Notifications disabled, skipping price check');
            return;
        }

        const threshold = prefs.notifications.priceChangeThreshold || 5;
        const watchlist = prefs.watchlist || [];

        if (watchlist.length === 0) {
            console.log('📭 Watchlist empty, nothing to monitor');
            return;
        }

        console.log(`🔍 Checking prices for ${watchlist.length} ticker(s) (threshold: ±${threshold}%)`);

        const notifications = await readNotifications();
        let newAlertsCount = 0;

        // Fetch current prices from Yahoo Finance
        for (const ticker of watchlist) {
            try {
                const quote = await yahooFinance.quote(ticker);

                if (!quote || !quote.regularMarketPrice) {
                    console.log(`  ⚠️  No data for ${ticker}`);
                    continue;
                }

                const currentPrice = quote.regularMarketPrice;
                const previousClose = quote.regularMarketPreviousClose || currentPrice;

                // Calcular cambio desde previous close
                const changeVsClose = ((currentPrice - previousClose) / previousClose) * 100;

                console.log(`  ${ticker}: $${currentPrice.toFixed(2)} (${changeVsClose > 0 ? '+' : ''}${changeVsClose.toFixed(2)}% vs close)`);

                // Si hay un precio previo en cache, comparar con ese
                const cachedPrice = priceCache.get(ticker);

                if (cachedPrice) {
                    const cacheDiff = ((currentPrice - cachedPrice) / cachedPrice) * 100;

                    // Crear alerta solo si supera el threshold
                    if (Math.abs(cacheDiff) >= threshold) {
                        const movement = cacheDiff > 0 ? '↑' : '↓';
                        const emoji = cacheDiff > 0 ? '🚀' : '📉';

                        const newNotification = {
                            id: Date.now().toString() + ticker,
                            type: 'price',
                            ticker,
                            title: `${ticker} ${movement} ${Math.abs(cacheDiff).toFixed(1)}%`,
                            message: `${emoji} ${ticker} moved ${cacheDiff > 0 ? '+' : ''}${cacheDiff.toFixed(2)}% to $${currentPrice.toFixed(2)} (from $${cachedPrice.toFixed(2)} at last check)`,
                            timestamp: new Date().toISOString(),
                            read: false,
                            priority: Math.abs(cacheDiff) >= 10 ? 'high' : 'medium'
                        };

                        notifications.unshift(newNotification);
                        newAlertsCount++;
                        console.log(`  🔔 Alert created: ${ticker} ${movement}${Math.abs(cacheDiff).toFixed(1)}% (priority: ${newNotification.priority})`);
                    }
                } else {
                    console.log(`  📍 First check for ${ticker}, baseline set at $${currentPrice.toFixed(2)}`);
                }

                // Actualizar cache
                priceCache.set(ticker, currentPrice);

            } catch (error) {
                console.error(`  ❌ Error fetching ${ticker}:`, error.message);
            }
        }

        // Guardar notificaciones (mantener solo últimas 50)
        const trimmed = notifications.slice(0, 50);
        await writeNotifications(trimmed);

        if (newAlertsCount > 0) {
            console.log(`✅ Created ${newAlertsCount} new price alert(s)`);
        } else {
            console.log('✅ No significant price changes detected (all within ±' + threshold + '%)');
        }

    } catch (error) {
        console.error('❌ Price monitor error:', error);
    }
}

function startPriceMonitor() {
    // 🚀 PRODUCTION: Every 15 minutes (aligned with Yahoo Finance update frequency)
    cron.schedule('*/15 * * * *', () => {
        const now = new Date().toLocaleTimeString('es-AR', {
            timeZone: 'America/Argentina/Buenos_Aires',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        console.log(`\n⏰ [${now}] Running price monitor...`);
        checkPriceAlerts();
    });

    console.log('✅ Price monitor started');
    console.log('⏱️  Schedule: Every 15 minutes (aligned with Yahoo Finance)');
    console.log('🕐 Market hours: Mon-Fri, 9:30 AM - 4:00 PM ET');
    console.log('💡 Checks are skipped when market is closed\n');

    // Run immediately on startup (after 10 seconds)
    setTimeout(() => {
        console.log('🚀 Running initial price check...\n');
        checkPriceAlerts();
    }, 10000);
}

module.exports = { startPriceMonitor };
