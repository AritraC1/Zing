// Browser adapter for Signal protocol crypto.
//
// `@signalapp/libsignal-client` is Signal's official Rust-core library,
// but its npm package ships native Node bindings (prebuilds/*.node) and
// cannot execute in a browser bundle. The Vite config aliases its
// import path here so application code can depend on the official
// package name while the actual crypto runs on `libsignal-protocol`
// — the browser build of libsignal (X3DH + Double Ratchet).
//
// The library is loaded lazily and cached: the dist bundle attaches
// itself to `window.libsignal` at import time, so it must never be
// imported at module top level (it would break Node-side tests, which
// get `window`/`global` shims from testSetup.js instead).

let loadPromise = null;

let nodeRequireHookInstalled = false;

// In non-browser environments (vitest under Node) the libsignal dist
// bundle executes through Node's loader, where Vite aliases do not
// apply. Install a require hook that fixes the package's two shipping
// bugs: the `mocha-bytebuffer` typo and the bytebuffer 3.x/5.x split
// (protobufjs 5 is built against bytebuffer ~5 — unifying onto that
// copy prevents "Illegal buffer" crashes).
async function ensureNodeRequireHook() {
  if (nodeRequireHookInstalled) return;
  nodeRequireHookInstalled = true;

  const isNode =
    typeof globalThis.process !== "undefined" &&
    Boolean(globalThis.process.versions?.node);
  const isBrowserLike =
    typeof window !== "undefined" && typeof window.document !== "undefined";

  if (!isNode || isBrowserLike) return; // real browser — nothing to do

  try {
    const { createRequire } = await import("node:module");
    const nodeRequire = createRequire(import.meta.url);
    const bytebuffer5 = nodeRequire.resolve(
      "libsignal-protocol/node_modules/protobufjs/node_modules/bytebuffer/dist/bytebuffer.js",
    );
    const Module = nodeRequire("node:module");
    const originalResolve = Module._resolveFilename;
    Module._resolveFilename = function (request, ...args) {
      if (request === "mocha-bytebuffer" || request === "bytebuffer") {
        return bytebuffer5;
      }
      return originalResolve.call(this, request, ...args);
    };
  } catch (error) {
    console.error("[signal-adapter] require hook failed:", error);
  }
}

function ensureGlobalShims() {
  // Belt and braces for non-browser environments (vitest, SSR).
  if (typeof globalThis.window === "undefined") {
    globalThis.window = globalThis;
  }
  if (typeof globalThis.global === "undefined") {
    globalThis.global = globalThis;
  }
}

/**
 * Load the libsignal namespace. Resolves once; concurrent callers
 * share the same import.
 *
 * @returns {Promise<object>} the `window.libsignal` namespace
 *   (Curve, KeyHelper, SessionBuilder, SessionCipher, ...)
 */
export function loadLibsignal() {
  if (!loadPromise) {
    loadPromise = (async () => {
      ensureGlobalShims();
      await ensureNodeRequireHook();
      await import("libsignal-protocol/dist/libsignal-protocol.js");
      const lib = globalThis.window?.libsignal;
      if (!lib || typeof lib.KeyHelper === "undefined") {
        throw new Error("libsignal-protocol failed to initialize");
      }
      return lib;
    })().catch((error) => {
      // Allow a retry after a failed load (e.g. transient build hiccup).
      loadPromise = null;
      throw error;
    });
  }
  return loadPromise;
}

export default loadLibsignal;
