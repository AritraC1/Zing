import { defineConfig } from 'vite'
import path from 'path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Dev shim to avoid loading native node bindings in the browser
      '@signalapp/libsignal-client': path.resolve(__dirname, 'src/shims/signal-adapter.js'),
    },
  },
})
