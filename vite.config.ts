import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // FRED: /api/fred/*  -> https://api.stlouisfed.org/fred/*
      '/api/fred': {
        target: 'https://api.stlouisfed.org',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/fred/, '/fred'),
        configure: (proxy) => {
          proxy.on('proxyReq', (_proxyReq, req) => {
            console.log('📡 [FRED]', req.method, req.url)
          })
        }
      },

      // FMP stable: /api/fmp/* -> https://financialmodelingprep.com/stable/*
      '/api/fmp': {
        target: 'https://financialmodelingprep.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/fmp/, '/stable'),
        configure: (proxy) => {
          proxy.on('proxyReq', (_proxyReq, req) => {
            console.log('📡 [FMP stable]', req.method, req.url)
          })
        }
      },

      // FMP v3: /api/fmpv3/* -> https://financialmodelingprep.com/api/v3/*
      '/api/fmpv3': {
        target: 'https://financialmodelingprep.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/fmpv3/, '/api/v3'),
        configure: (proxy) => {
          proxy.on('proxyReq', (_proxyReq, req) => {
            console.log('📡 [FMP v3]', req.method, req.url)
          })
        }
      }
    }
  }
})
