import { defineConfig } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// ESM package: __dirname is not defined
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@signalapp/libsignal-client': path.resolve(__dirname, 'src/shims/signal-adapter.js'),
    },
  },
  // Local dev: proxy API + Socket.IO requests to the local server
  // (mirrors the nginx proxy used in the Docker setup)
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  test: {
    environment: 'node',
    globals: true,
  },
})
