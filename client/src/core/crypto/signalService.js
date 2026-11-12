// High-level E2EE service for 1:1 chats (Signal protocol).
//
// Responsibilities:
//   - fetch and cache prekey bundles (GET /auth/keys/:userId)
//   - establish sessions (X3DH via libsignal SessionBuilder)
//   - encrypt/decrypt message content via the Double Ratchet
//   - pack/unpack the per-device envelope format (envelope.js)
//
// Encryption is per DEVICE: every keyed device of both the sender and
// the recipient gets its own ciphertext inside the envelope, so the
// sender's own devices can read their own outgoing messages.
//
// Fail-closed: if no session can be established for ANY device the
// caller gets an error instead of silently downgrading to plaintext.
// If the peer simply has no keys yet (pre-upgrade account) the caller
// can fall back to plaintext explicitly via hasKeyedDevices().

import axiosInstance from "../api/axiosInstance";
import ENDPOINTS from "../api/endpoints";
import {
  initSignal,
  ensureKeysRegistered,
  replenishPreKeys,
  PREKEY_LOW_THRESHOLD,
} from "./keyManager";
import {
  buildEnvelope,
  parseEnvelope,
  isEnvelope,
  binaryStringToBase64,
  base64ToBuffer,
  utf8ToBuffer,
  bufferToUtf8,
} from "./envelope";

// Short cache: one-time prekeys are consumed per bundle fetch, so a
// bundle may never be reused for a second session build.
const BUNDLE_CACHE_TTL_MS = 10 * 1000;

let ctxPromise = null;
const bundleCaches = new Map(); // userId -> { fetchedAt, devices }

/**
 * Initialize the crypto layer for this user/device. Call once per
 * login (and after onboarding). Also makes sure the server has a
 * usable batch of one-time prekeys for this device.
 */
export async function init(userId, deviceId) {
  const key = `${userId}|${deviceId}`;

  if (!ctxPromise) {
    ctxPromise = (async () => {
      const ctx = await initSignal(userId, deviceId);
      try {
        await ensureKeysRegistered(userId, deviceId);
      } catch (error) {
        console.error("[signalService] key registration failed:", error);
        // Key upload failures must not wedge the session forever:
        // forget the context so the next login retries cleanly.
        ctxPromise = null;
        throw error;
      }
      return ctx;
    })().catch((error) => {
      ctxPromise = null;
      throw error;
    });
    bundleCaches.clear();
    void key;
  }
  return ctxPromise;
}

/** True when crypto is initialized for this user/device. */
export function isReady() {
  return Boolean(ctxPromise);
}

/**
 * Resolves when the crypto layer is usable, or rejects after a short
 * timeout so message sends fail visibly instead of hanging.
 */
export function whenReady(timeoutMs = 8000) {
  if (!ctxPromise) {
    return Promise.reject(
      new Error("E2EE not initialized — call signalService.init() first"),
    );
  }
  return Promise.race([
    ctxPromise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("E2EE initialization timed out")),
        timeoutMs,
      ),
    ),
  ]);
}

/** Forget the initialized context (logout / account switch). */
export function reset() {
  ctxPromise = null;
  bundleCaches.clear();
}

async function requireCtx() {
  if (!ctxPromise) {
    throw new Error("E2EE not initialized — call signalService.init() first");
  }
  return ctxPromise;
}

// ------------------------------------------------------------------
// Prekey bundles
// ------------------------------------------------------------------

async function fetchBundles(userId, { force = false } = {}) {
  const cached = bundleCaches.get(userId);
  if (
    !force &&
    cached &&
    Date.now() - cached.fetchedAt < BUNDLE_CACHE_TTL_MS
  ) {
    return cached.devices;
  }

  const response = await axiosInstance.get(
    ENDPOINTS.KEYS.BUNDLE.replace(":userId", userId),
  );
  const devices = response.data?.data?.bundles ?? [];

  bundleCaches.set(userId, { fetchedAt: Date.now(), devices });

  // Replenish in the background when the peer (or we) run low — the
  // server also emits `keys:low`, this is the proactive path.
  const low = devices.some(
    (device) => device.preKeyCount < PREKEY_LOW_THRESHOLD,
  );
  if (low) {
    void replenishPreKeysForCurrentUser().catch(() => {});
  }

  return devices;
}

async function replenishPreKeysForCurrentUser() {
  if (!ctxPromise) return null;
  const ctx = await ctxPromise;
  return replenishPreKeys(ctx.userId, ctx.deviceId);
}

/**
 * Does a user have any Signal-keyed devices? Used to decide whether a
 * 1:1 conversation can be encrypted at all.
 */
export async function hasKeyedDevices(userId) {
  try {
    const devices = await fetchBundles(userId);
    return devices.length > 0;
  } catch {
    return false;
  }
}

/**
 * Drop every cached bundle. One-time prekeys are consumed per bundle
 * fetch, so caches must never survive a session build or a test.
 */
export function clearBundleCache() {
  bundleCaches.clear();
}

function toLibsignalBundle(bundle) {
  return {
    identityKey: base64ToBuffer(bundle.identityPublicKey),
    registrationId: 0, // server does not track registration ids
    signedPreKey: {
      keyId: bundle.signedPreKey.keyId,
      publicKey: base64ToBuffer(bundle.signedPreKey.publicKey),
      signature: base64ToBuffer(bundle.signedPreKey.signature),
    },
    preKey: bundle.oneTimePreKey
      ? {
          keyId: bundle.oneTimePreKey.keyId,
          publicKey: base64ToBuffer(bundle.oneTimePreKey.publicKey),
        }
      : undefined,
  };
}

async function buildSession(ctx, peerUserId, deviceId, bundle) {
  const { libsignal, store } = ctx;
  const address = new libsignal.SignalProtocolAddress(peerUserId, deviceId);
  const builder = new libsignal.SessionBuilder(store, address);
  await builder.processPreKey(toLibsignalBundle(bundle));
  return address;
}

// ------------------------------------------------------------------
// Encryption (send path)
// ------------------------------------------------------------------

/**
 * Encrypt a plaintext message for every keyed device of both the
 * recipient and the sender.
 *
 * @returns {Promise<string>} the envelope string for message.content
 */
export async function encryptDirect(peerUserId, plaintext, { ctx: ctxOverride } = {}) {
  const ctx = ctxOverride || (await whenReady());
  const { libsignal, store } = ctx;

  if (!plaintext || !plaintext.length) {
    throw new Error("Cannot encrypt an empty message");
  }

  const peerDevices = await fetchBundles(peerUserId);
  const myDevices = await fetchBundles(ctx.userId);

  // The recipient must have at least one keyed device — otherwise the
  // message would silently become unreadable to them.
  if (peerDevices.length === 0) {
    throw new Error("No keyed devices found for this contact");
  }

  const targets = [...peerDevices, ...myDevices];

  const entries = {};
  const failures = [];

  for (const device of targets) {
    const isSelf = String(device.deviceId) === String(ctx.deviceId);
    const owner = peerDevices.includes(device) ? peerUserId : ctx.userId;

    try {
      const addressName = isSelf ? ctx.userId : owner;
      const address = `${addressName}.${device.deviceId}`;

      // Establish the X3DH session up front when we don't have one —
      // encrypting with no session throws inside libsignal's job lock
      // and leaks an unhandled rejection.
      if (!store.sessionExists(address)) {
        await buildSession(ctx, addressName, device.deviceId, device);
      }

      let cipher = new libsignal.SessionCipher(store, {
        toString: () => address,
        getName: () => addressName,
        getDeviceId: () => device.deviceId,
      });

      let encrypted;
      try {
        encrypted = await cipher.encrypt(utf8ToBuffer(plaintext), "utf8");
      } catch (error) {
        // Rebuild from a fresh bundle and retry once (ratchet state
        // out of sync, replayed one-time prekey, ...).
        console.warn(
          `[signalService] encrypt retry for ${address}:`,
          error?.message,
        );
        const fresh = await fetchBundles(owner, { force: true });
        const deviceBundle = fresh.find((b) => b.deviceId === device.deviceId);
        if (!deviceBundle) throw error;
        await buildSession(ctx, addressName, device.deviceId, deviceBundle);
        cipher = new libsignal.SessionCipher(store, {
          toString: () => address,
          getName: () => addressName,
          getDeviceId: () => device.deviceId,
        });
        encrypted = await cipher.encrypt(utf8ToBuffer(plaintext), "utf8");
      }

      entries[device.deviceId] = {
        t: encrypted.type,
        b: binaryStringToBase64(encrypted.body),
      };
    } catch (error) {
      console.error(
        `[signalService] encrypt failed for device ${device.deviceId}:`,
        error,
      );
      failures.push(device.deviceId);
    }
  }

  // The sending device's own entry is mandatory — without it we could
  // never read the message back (echoes, history, reloads).
  if (!entries[ctx.deviceId]) {
    throw new Error(
      `E2EE failed: could not encrypt for the sending device (${
        failures.join(", ") || "unknown"
      })`,
    );
  }

  // Build the session->bundle cache is now dirty: one-time prekeys for
  // the devices we built sessions against have been consumed.
  bundleCaches.delete(peerUserId);
  bundleCaches.delete(ctx.userId);

  return buildEnvelope(ctx.deviceId, entries);
}

// ------------------------------------------------------------------
// Decryption (receive path)
// ------------------------------------------------------------------

/**
 * Decrypt an envelope received in a 1:1 chat.
 *
 * @param {string} senderUserId the message sender's user id
 * @param {string} content envelope (or plaintext passthrough)
 * @returns {Promise<string|null>} plaintext, or null when the content
 *   is an envelope that cannot be decrypted for this device.
 */
export async function decryptDirect(
  senderUserId,
  content,
  { ctx: ctxOverride } = {},
) {
  if (!isEnvelope(content)) return content;

  const envelope = parseEnvelope(content);
  if (!envelope) return null;

  const ctx = ctxOverride || (await requireCtx());
  const { libsignal, store } = ctx;

  const entry = envelope.entries[ctx.deviceId];
  if (!entry || !entry.b) return null;

  const addressName = String(senderUserId) === String(ctx.userId)
    ? ctx.userId
    : senderUserId;
  const address = `${addressName}.${envelope.senderDeviceId}`;
  const cipher = new libsignal.SessionCipher(store, {
    toString: () => address,
    getName: () => addressName,
    getDeviceId: () => envelope.senderDeviceId,
  });

  try {
    const buffer = base64ToBuffer(entry.b);
    const plaintextBuffer =
      entry.t === 3
        ? await cipher.decryptPreKeyWhisperMessage(buffer, "binary")
        : await cipher.decryptWhisperMessage(buffer, "binary");
    return bufferToUtf8(plaintextBuffer);
  } catch (error) {
    console.error(
      `[signalService] decrypt failed from ${address}:`,
      error,
    );
    return null;
  }
}

export { PREKEY_LOW_THRESHOLD };
