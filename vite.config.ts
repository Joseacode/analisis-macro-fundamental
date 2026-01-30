import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api/sec": { target: "http://localhost:8787", changeOrigin: true, secure: false },
      "/api/yf": { target: "http://localhost:8787", changeOrigin: true, secure: false },
      "/api/health": { target: "http://localhost:8787", changeOrigin: true, secure: false },

      "/api/fred": {
        target: "https://api.stlouisfed.org/fred",
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/api\/fred/, "")
      },

      // ✅ para que Fundamental no reciba HTML de Vite
      "/api/fmp": {
        target: "https://financialmodelingprep.com",
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/api\/fmp/, "")
      }
    }
  }
});
