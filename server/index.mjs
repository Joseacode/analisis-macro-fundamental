// server/index.mjs
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createRequire } from "module";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT ?? 8787);

// CJS routes (Yahoo)
const require = createRequire(import.meta.url);
const { registerYfRoutes } = require("./routes/yfRoutes.cjs");
const { registerEarningsRoutes } = require("./routes/earningsRoutes.cjs");
registerEarningsRoutes(app);

// ✅ NEW: Notifications routes
const notificationsRoutes = require("./routes/notificationsRoutes.cjs");

// ✅ NEW: Preferences routes
const preferencesRoutes = require("./routes/preferencesRoutes.cjs");

// ✅ NEW: SerpApi routes  
const serpApiRoutes = require("./routes/serpApiRoutes.cjs");

// ✅ NEW: Price monitor service
const { startPriceMonitor } = require("./services/priceMonitor.cjs");

// Health check
app.get("/api/health", (_req, res) => {
    res.json({
        ok: true,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        services: {
            yahooFinance: true,
            notifications: true,
            preferences: true,
            serpApi: !!process.env.SERPAPI_KEY,
            priceMonitor: true
        }
    });
});

// Registrar rutas de Yahoo Finance
registerYfRoutes(app);

// ✅ NEW: Registrar rutas de Notifications
app.use("/api/notifications", notificationsRoutes);

// ✅ NEW: Registrar rutas de Preferences
app.use("/api/preferences", preferencesRoutes);

// ✅ NEW: Registrar rutas de SerpApi
app.use("/api/serpapi", serpApiRoutes);

// ✅ NEW: Iniciar price monitor (cron job)
startPriceMonitor();

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: "Ruta no encontrada",
        path: req.path,
        availableRoutes: [
            "/api/earnings/_debug",
            "/api/earnings/:ticker",
            "/api/health",
            "/api/yf/_debug",
            "/api/yf/sp500",
            "/api/yf/sp500/top/:count",
            "/api/yf/sector/:etf",
            "/api/yf/snapshot/:symbol",
            "/api/notifications",
            "/api/notifications/:id/read",
            "/api/preferences",
            "/api/serpapi/stock/:ticker",
            "/api/serpapi/trending"
        ]
    });
});

// Error handler global
app.use((err, req, res, next) => {
    console.error("❌ Error no manejado:", err);
    res.status(500).json({
        error: "Error interno del servidor",
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

app.listen(PORT, () => {
    console.log(`\n✅ Backend corriendo en http://localhost:${PORT}`);
    console.log(`\n📍 Rutas disponibles:`);
    console.log(`   🏥 Health:        http://localhost:${PORT}/api/health`);
    console.log(`   🔍 Debug:         http://localhost:${PORT}/api/yf/_debug`);
    console.log(`   📊 SP500:         http://localhost:${PORT}/api/yf/sp500`);
    console.log(`   🔝 Top SP500:     http://localhost:${PORT}/api/yf/sp500/top/50`);
    console.log(`   🎯 Sector:        http://localhost:${PORT}/api/yf/sector/XLK?top=10`);
    console.log(`   💰 Snapshot:      http://localhost:${PORT}/api/yf/snapshot/AAPL`);
    console.log(`\n🆕 Nuevas funcionalidades:`);
    console.log(`   🔔 Notifications: http://localhost:${PORT}/api/notifications`);
    console.log(`   ⚙️  Preferences:   http://localhost:${PORT}/api/preferences`);
    console.log(`   🔍 SerpApi Stock: http://localhost:${PORT}/api/serpapi/stock/AAPL`);
    console.log(`   📈 SerpApi Trend: http://localhost:${PORT}/api/serpapi/trending`);
    console.log(`\n⚙️  Servicios activos:`);
    console.log(`   ✅ Yahoo Finance API`);
    console.log(`   ✅ Price Monitor (cron cada 1min - testing mode)`);
    console.log(`   ✅ Preferences Sync`);
    console.log(`   ${process.env.SERPAPI_KEY ? '✅' : '⚠️ '} SerpApi ${process.env.SERPAPI_KEY ? '(configurado)' : '(opcional - falta SERPAPI_KEY en .env)'}\n`);
});
