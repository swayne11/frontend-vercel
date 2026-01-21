import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import dotenv from 'dotenv'

dotenv.config()

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')

  console.log("DEBUG: Vite Proxy Config - MCP_API_URL:", env.MCP_API_URL)
  console.log("DEBUG: Vite Proxy Config - Client ID Present:", !!env.CF_ACCESS_CLIENT_ID)

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      host: '0.0.0.0',
      allowedHosts: ['app.aidoeswhat.org', 'aidoeswhat.org', 'localhost', '127.0.0.1', '.vercel.app'],
      proxy: {
        '/api': {
          target: env.MCP_API_URL || 'http://localhost:8000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              // Inject Service Tokens if present (Simulate Vercel BFF)
              const clientId = env.CF_ACCESS_CLIENT_ID;
              const clientSecret = env.CF_ACCESS_CLIENT_SECRET;
              if (clientId) {
                proxyReq.setHeader('CF-Access-Client-Id', clientId);
              }
              if (clientSecret) {
                proxyReq.setHeader('CF-Access-Client-Secret', clientSecret);
              }
            });
          }
        }
      }
    }
  }
})
