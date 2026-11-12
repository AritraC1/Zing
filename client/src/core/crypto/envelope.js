// E2EE envelope format for message payloads.
//
// A plaintext never travels on the wire for 1:1 chats. Instead the
// message `content` field carries an envelope:
//
//     zingenc:v1:<base64 JSON>
//
// where the JSON is
//     { v: 1, d: "<senderDeviceId>", e: { "<recipientDeviceId>": { t, b } } }
//
//  - one ciphertext entry per keyed device of BOTH the sender and the
//    recipient, so the sender's own devices can read the message too
//  - t = Signal message type (3 = PreKeyWhisperMessage, 1 = WhisperMessage)
//  - b = base64 of the libsignal ciphertext body
//
// Anything that does not start with the prefix is treated as plaintext
// (group chats pre-Sender-Keys, legacy messages, system content).

import { loadLibsignal } from "@signalapp/libsignal-client";

export const ENVELOPE_PREFIX = "zingenc:v1:";
const ENVELOPE_VERSION = 1;

export function isEnvelope(content) {
  return typeof content === "string" && content.startsWith(ENVELOPE_PREFIX);
}

/**
 * Build an envelope from per-device ciphertexts.
 * @param {string} senderDeviceId
 * @param {Object<string, {t: number, b: string}>} entries keyed by target device id
 */
export function buildEnvelope(senderDeviceId, entries) {
  if (!entries || Object.keys(entries).length === 0) {
    throw new Error("Cannot build an empty E2EE envelope");
  }
  const json = JSON.stringify({ v: ENVELOPE_VERSION, d: senderDeviceId, e: entries });
  return ENVELOPE_PREFIX + btoa(json);
}

/**
 * Parse an envelope. Returns null for non-envelope content.
 * @returns {{ senderDeviceId: string, entries: Object<string, {t: number, b: string}> } | null}
 */
export function parseEnvelope(content) {
  if (!isEnvelope(content)) return null;
  try {
    const decoded = JSON.parse(atob(content.slice(ENVELOPE_PREFIX.length)));
    if (decoded?.v !== ENVELOPE_VERSION || !decoded.d || !decoded.e) return null;
    return { senderDeviceId: decoded.d, entries: decoded.e };
  } catch {
    return null;
  }
}

/**
 * Base64 <-> binary string helpers for libsignal bodies.
 * libsignal returns ciphertext bodies as "binary" strings (one char
 * per byte); base64 keeps them JSON-safe.
 */
export function bodyToBase64(binaryString) {
  return btoa(binaryString);
}

export async function base64ToBody(base64) {
  const binary = atob(base64);
  // Keep the char-code-per-byte invariant libsignal expects.
  return binary;
}

/** ArrayBuffer -> binary string (char code per byte). */
export function bufferToBinaryString(buffer) {
  const bytes = new Uint8Array(buffer);
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
  return out;
}

/** Binary string -> ArrayBuffer. */
export function binaryStringToBuffer(binaryString) {
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i) & 0xff;
  return bytes.buffer;
}

/** ArrayBuffer -> base64 (works on large inputs without call-stack limits). */
export function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/**
 * libsignal ciphertext bodies are "binary" strings (char code per
 * byte) — base64 keeps them JSON-safe in the envelope.
 */
export function binaryStringToBase64(binaryString) {
  return btoa(binaryString);
}

/** base64 -> ArrayBuffer. */
export function base64ToBuffer(base64) {
  const binary = atob(base64);
  return binaryStringToBuffer(binary);
}

/** UTF-8 plaintext -> ArrayBuffer for libsignal encrypt input. */
export function utf8ToBuffer(text) {
  return new TextEncoder().encode(text).buffer;
}

/** ArrayBuffer plaintext -> UTF-8 string. */
export function bufferToUtf8(buffer) {
  return new TextDecoder().decode(buffer);
}

/** Sanity helper used by tests: round-trip a plaintext through the helpers. */
export async function smokeTestHelpers(text) {
  await loadLibsignal();
  return bufferToUtf8(utf8ToBuffer(text)) === text;
}
