import { defineConfig } from 'vite'
import path from 'path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@signalapp/libsignal-client': path.resolve(__dirname, 'src/shims/signal-adapter.js'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
  },
})
