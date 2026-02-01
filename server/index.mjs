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

// =======================
// ✅ IMPORTAR RUTAS CJS
// =======================
const require = createRequire(import.meta.url);

// Yahoo Finance routes
const { registerYfRoutes } = require("./routes/yfRoutes.cjs");

// Earnings routes
const { registerEarningsRoutes } = require("./routes/earningsRoutes.cjs");

// ✅ Fundamentals routes
const { registerFundamentalsRoutes } = require("./routes/fundamentalsRoutes.cjs");

// Notifications routes
const notificationsRoutes = require("./routes/notificationsRoutes.cjs");

// Preferences routes
const preferencesRoutes = require("./routes/preferencesRoutes.cjs");

// SerpApi routes
const serpApiRoutes = require("./routes/serpApiRoutes.cjs");

// Price monitor service
const { startPriceMonitor } = require("./services/priceMonitor.cjs");

// =======================
// ✅ HEALTH CHECK
// =======================
app.get("/api/health", (_req, res) => {
    res.json({
        ok: true,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || "development",
        services: {
            yahooFinance: true,
            earnings: true,
            fundamentals: true,
            notifications: true,
            preferences: true,
            serpApi: !!process.env.SERPAPI_KEY,
            priceMonitor: true,
        },
    });
});

// =======================
// ✅ REGISTRAR RUTAS
// =======================

// Yahoo Finance
registerYfRoutes(app);

// Earnings
registerEarningsRoutes(app);

// ✅ Fundamentals (NUEVO)
registerFundamentalsRoutes(app);

// Notifications
app.use("/api/notifications", notificationsRoutes);

// Preferences
app.use("/api/preferences", preferencesRoutes);

// SerpApi
app.use("/api/serpapi", serpApiRoutes);

// =======================
// ✅ INICIAR SERVICIOS
// =======================
startPriceMonitor();

// =======================
// ✅ ERROR HANDLERS
// =======================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: "Ruta no encontrada",
        path: req.path,
        availableRoutes: [
            "/api/health",
            "/api/yf/_debug",
            "/api/yf/sp500",
            "/api/yf/sp500/top/:count",
            "/api/yf/sector/:etf",
            "/api/yf/snapshot/:symbol",
            "/api/earnings/_debug",
            "/api/earnings/:ticker",
            "/api/fundamentals/:ticker/series",
            "/api/notifications",
            "/api/notifications/:id/read",
            "/api/preferences",
            "/api/serpapi/stock/:ticker",
            "/api/serpapi/trending",
        ],
    });
});

// Error handler global
app.use((err, req, res, next) => {
    console.error("❌ Error no manejado:", err);
    res.status(500).json({
        error: "Error interno del servidor",
        message: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
});

// =======================
// ✅ START SERVER
// =======================
app.listen(PORT, () => {
    console.log(`\n✅ Backend corriendo en http://localhost:${PORT}`);
    console.log(`\n📍 Rutas disponibles:`);
    console.log(`   🏥 Health:          http://localhost:${PORT}/api/health`);
    console.log(`\n📊 Yahoo Finance:`);
    console.log(`   🔍 Debug:           http://localhost:${PORT}/api/yf/_debug`);
    console.log(`   📊 SP500:           http://localhost:${PORT}/api/yf/sp500`);
    console.log(`   🔝 Top SP500:       http://localhost:${PORT}/api/yf/sp500/top/50`);
    console.log(`   🎯 Sector:          http://localhost:${PORT}/api/yf/sector/XLK?top=10`);
    console.log(`   💰 Snapshot:        http://localhost:${PORT}/api/yf/snapshot/AAPL`);
    console.log(`\n📈 Earnings:`);
    console.log(`   🔍 Debug:           http://localhost:${PORT}/api/earnings/_debug`);
    console.log(`   📊 Ticker:          http://localhost:${PORT}/api/earnings/AAPL`);
    console.log(`\n💼 Fundamentals (NUEVO):`);
    console.log(`   📊 Series:          http://localhost:${PORT}/api/fundamentals/MSFT/series?limit=16`);
    console.log(`\n🆕 Funcionalidades adicionales:`);
    console.log(`   🔔 Notifications:   http://localhost:${PORT}/api/notifications`);
    console.log(`   ⚙️  Preferences:     http://localhost:${PORT}/api/preferences`);
    console.log(`   🔍 SerpApi Stock:   http://localhost:${PORT}/api/serpapi/stock/AAPL`);
    console.log(`   📈 SerpApi Trend:   http://localhost:${PORT}/api/serpapi/trending`);
    console.log(`\n⚙️  Servicios activos:`);
    console.log(`   ✅ Yahoo Finance API`);
    console.log(`   ✅ SEC CompanyFacts API (Fundamentals)`);
    console.log(`   ✅ Price Monitor (cron cada 1min - testing mode)`);
    console.log(`   ✅ Preferences Sync`);
    console.log(`   ${process.env.SERPAPI_KEY ? "✅" : "⚠️ "} SerpApi ${process.env.SERPAPI_KEY ? "(configurado)" : "(opcional - falta SERPAPI_KEY en .env)"}\n`);
});
