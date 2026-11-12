import { defineConfig, createLogger } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The API dev process (`node --watch`) restarts on every server change — every
// restart (and every browser reload) disturbs the proxied /socket.io
// websocket: ECONNRESET on the old socket, EPIPE on in-flight writes and
// ECONNREFUSED while it dials the API as it reboots. Socket.IO immediately
// recovers from all three, but Vite prints each with a full stack trace,
// drowning the terminal. Silence ONLY those transient transport codes for
// the ws proxy; every other error passes through untouched.
const devLogger = createLogger()
const ORIGINAL_ERROR = devLogger.error.bind(devLogger)
const TRANSIENT_CONNECT_ERRORS = ["ECONNRESET", "EPIPE", "ECONNREFUSED"]
devLogger.error = (msg, options) => {
  if (typeof msg === "string" && isTransientProxyNoise(msg)) {
    return
  }
  ORIGINAL_ERROR(msg, options)
}

function isTransientProxyNoise(msg) {
  // Wrapped by Vite ("ws proxy error: ...") or surfacing as a bare
  // AggregateError stack straight from node:net's multi-address connect.
  const isProxyNoise =
    msg.includes("ws proxy") || msg.includes("AggregateError")
  const isTransient = TRANSIENT_CONNECT_ERRORS.some((code) =>
    msg.includes(code),
  )
  return isProxyNoise && isTransient
}

// ESM package: __dirname is not defined
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  customLogger: devLogger,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // `@signalapp/libsignal-client` ships Node-native bindings that
      // cannot run in a browser bundle. The adapter bridges its import
      // path to the browser-safe `libsignal-protocol` build.
      '@signalapp/libsignal-client': path.resolve(__dirname, 'src/shims/signal-adapter.js'),
      // libsignal-protocol 1.3.15 requires a non-existent package
      // ("mocha-bytebuffer", a typo for bytebuffer) and its bundled
      // protobufjs 5 pins bytebuffer ~5 while the package pins ^3.5.5
      // — two incompatible copies cause "Illegal buffer" at runtime.
      // Pinning every bytebuffer import onto the protobufjs copy
      // (the version protobufjs is actually built against) fixes it.
      'mocha-bytebuffer': path.resolve(__dirname, 'node_modules/libsignal-protocol/node_modules/protobufjs/node_modules/bytebuffer/dist/bytebuffer.js'),
      bytebuffer: path.resolve(__dirname, 'node_modules/libsignal-protocol/node_modules/protobufjs/node_modules/bytebuffer/dist/bytebuffer.js'),
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
    // Runs before test files import modules: the libsignal adapter
    // needs window/global shims under Node.
    setupFiles: ['src/testSetup.js'],
  },
})
