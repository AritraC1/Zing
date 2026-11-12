// Signal key management for this device.
//
// Owns the lifecycle of the device's key material:
//   1. generate once per device: identity key pair, registration id,
//      one signed prekey and a batch of one-time prekeys
//   2. upload the public parts to the prekey directory
//      (POST /auth/keys/register)
//   3. replenish one-time prekeys when the server reports `keys:low`
//      or when a bundle fetch shows the count is running low
//
// Private keys are stored in IndexedDB only (protocolStore) and are
// never sent anywhere.

import axiosInstance from "../api/axiosInstance";
import ENDPOINTS from "../api/endpoints";
import { createProtocolStore } from "./protocolStore";

// Size of a one-time prekey batch, matching the Signal clients.
const PREKEY_BATCH_SIZE = 100;
// Replenish when unused one-time prekeys drop below this count.
export const PREKEY_LOW_THRESHOLD = 25;

let contexts = new Map(); // "userId|deviceId" -> Promise<context>
let primaryContextKey = null;

/**
 * Initialize (or reuse) a user/device's Signal state.
 *
 * @param {string} userId  the signed-in user's id
 * @param {string} deviceId this browser/device's persistent id
 * @returns {Promise<{libsignal, store}>}
 */
export function initSignal(userId, deviceId) {
  if (!userId || !deviceId) {
    return Promise.reject(new Error("initSignal requires userId and deviceId"));
  }

  const key = `${userId}|${deviceId}`;
  primaryContextKey = key;

  if (!contexts.has(key)) {
    contexts.set(
      key,
      createProtocolStore({ userId, deviceId }).catch((error) => {
        contexts.delete(key);
        throw error;
      }),
    );
  }

  return contexts.get(key);
}

/** Test/diagnostic hook: forget all in-process contexts. */
export function resetSignalContext() {
  contexts = new Map();
  primaryContextKey = null;
}

function currentContext() {
  return primaryContextKey ? contexts.get(primaryContextKey) : null;
}

/**
 * Generate and persist the device's key material. Idempotent — if an
 * identity already exists nothing is regenerated.
 */
async function ensureIdentity(ctx) {
  if (ctx.store.hasIdentity()) return false;

  const { KeyHelper } = ctx.libsignal;

  const identityKeyPair = await KeyHelper.generateIdentityKeyPair();
  const registrationId = await KeyHelper.generateRegistrationId();

  await ctx.store.saveIdentityKeyPair(identityKeyPair);
  await ctx.store.saveRegistrationId(registrationId);

  return true;
}

/**
 * Make sure the device has a signed prekey registered locally.
 * Rotating signed prekeys on a schedule is future work; one stable
 * signed prekey per device is enough for the first X3DH rollout.
 */
async function ensureSignedPreKey(ctx) {
  if (await ctx.store.loadSignedPreKey(1)) return false;

  const { KeyHelper } = ctx.libsignal;
  const signedPreKey = await KeyHelper.generateSignedPreKey(
    ctx.store.getIdentity(),
    1,
  );

  await ctx.store.storeSignedPreKey(1, {
    pubKey: signedPreKey.keyPair.pubKey,
    privKey: signedPreKey.keyPair.privKey,
    signature: signedPreKey.signature,
  });

  return true;
}

/**
 * Generate a batch of one-time prekeys locally.
 * @returns {Promise<Array<{keyId: number, publicKey: ArrayBuffer}>>}
 *   the public parts to upload
 */
export async function generatePreKeyBatch(ctx, count = PREKEY_BATCH_SIZE) {
  const { KeyHelper } = ctx.libsignal;
  const batch = [];

  let nextKeyId = await ctx.store.nextPreKeyId();

  for (let i = 0; i < count; i++) {
    const preKey = await KeyHelper.generatePreKey(nextKeyId);
    await ctx.store.storePreKey(nextKeyId, preKey.keyPair);
    batch.push({ keyId: nextKeyId, publicKey: preKey.keyPair.pubKey });
    nextKeyId += 1;
  }

  await ctx.store.bumpPreKeyIdCounter(nextKeyId);

  return batch;
}

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/**
 * Upload this device's key material. The identity + signed prekey and
 * the given one-time prekey batch are stored server-side (public only).
 */
export async function registerKeys(ctx, preKeys) {
  const identityKeyPair = ctx.store.getIdentity();

  const payload = {
    deviceId: ctx.deviceId,
    identityPublicKey: toBase64(identityKeyPair.pubKey),
    signedPreKeyId: 1,
    signedPreKeyPublic: toBase64((await ctx.store.loadSignedPreKey(1)).pubKey),
    signedPreKeySignature: toBase64((await ctx.store.loadSignedPreKey(1)).signature),
    preKeys: preKeys.map((preKey) => ({
      keyId: preKey.keyId,
      publicKey: toBase64(preKey.publicKey),
    })),
  };

  const response = await axiosInstance.post(ENDPOINTS.KEYS.REGISTER, payload);
  return response.data?.data;
}

/**
 * Full bootstrap: hydrate/generate key material and make sure the
 * server has a usable batch of one-time prekeys. Safe to call on every
 * login — repeated calls are cheap no-ops.
 */
export async function ensureKeysRegistered(userId, deviceId) {
  const ctx = await initSignal(userId, deviceId);

  const generatedIdentity = await ensureIdentity(ctx);
  await ensureSignedPreKey(ctx);

  // Always leave the server with a healthy batch. On first registration
  // this uploads the full batch; on later logins it only tops up when
  // the server is running low.
  let serverCount = null;
  try {
    const response = await axiosInstance.get(
      ENDPOINTS.KEYS.PREKEY_COUNT.replace(":deviceId", deviceId),
    );
    serverCount = response.data?.data?.preKeyCount ?? null;
  } catch {
    // The device may not be registered yet — treat as empty.
    serverCount = null;
  }

  if (serverCount === null || serverCount < PREKEY_LOW_THRESHOLD) {
    const batch = await generatePreKeyBatch(ctx);
    const result = await registerKeys(ctx, batch);
    return {
      generatedIdentity,
      registered: true,
      preKeyCount: result?.preKeyCount ?? batch.length,
    };
  }

  return { generatedIdentity, registered: false, preKeyCount: serverCount };
}

/**
 * Server told us (`keys:low`) that one-time prekeys are running low:
 * generate a fresh batch and replace the unused ones.
 */
export async function replenishPreKeys(userId, deviceId) {
  const ctx = await initSignal(userId, deviceId);
  const batch = await generatePreKeyBatch(ctx);
  const result = await registerKeys(ctx, batch);
  return result?.preKeyCount ?? batch.length;
}

/**
 * Replenish prekeys for whichever user/device was last initialized —
 * used by the `keys:low` socket event where no ids are needed.
 */
export async function replenishCurrent() {
  const ctx = currentContext();
  if (!ctx) return null;
  return replenishPreKeys(ctx.userId, ctx.deviceId);
}

export { PREKEY_BATCH_SIZE };
