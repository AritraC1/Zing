// Vitest setup — runs before test files import modules.
//
// The libsignal-protocol build is a browser bundle: it assigns to
// `window.libsignal` and its embedded UMD chunks use the `global`
// object. Under Node neither exists, so provide shims before the
// dynamic import happens.

if (typeof globalThis.window === "undefined") {
  globalThis.window = globalThis;
}
if (typeof globalThis.global === "undefined") {
  globalThis.global = globalThis;
}
if (typeof globalThis.self === "undefined") {
  globalThis.self = globalThis;
}
