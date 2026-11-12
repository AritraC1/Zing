// Signal protocol state store.
//
// libsignal-protocol talks to a synchronous-per-call promise store
// holding four kinds of records:
//   - our identity key pair + registration id
//   - remote identity keys (trust-on-first-use pins)
//   - one-time prekey pairs (removed after use)
//   - signed prekey pairs
//   - session records per remote address (the Double Ratchet state)
//
// Everything lives in IndexedDB (`zing-signal`) and is hydrated into
// memory on init; writes go through to IndexedDB immediately so a
// reload never loses ratchet state. Keys are device-scoped: they live
// in this database only, never in Redux or localStorage.

import { loadLibsignal } from "@signalapp/libsignal-client";

const DB_NAME = "zing-signal";
const DB_VERSION = 1;

const STORES = {
  META: "meta", // our identity key pair + registration id
  IDENTITY_KEYS: "identityKeys", // remote address -> identity key
  SESSIONS: "sessions", // address -> serialized session record
  PRE_KEYS: "preKeys", // preKeyId -> key pair
  SIGNED_PRE_KEYS: "signedPreKeys", // signedPreKeyId -> record
};

let dbPromise = null;

function hasIndexedDB() {
  return typeof indexedDB !== "undefined";
}

function openDb() {
  if (!hasIndexedDB()) return Promise.resolve(null);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        Object.values(STORES).forEach((name) => {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name);
          }
        });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.error("[signalStore] open failed:", request.error);
        resolve(null);
      };
    } catch (err) {
      console.error("[signalStore] open threw:", err);
      resolve(null);
    }
  });

  return dbPromise;
}

function txGet(store, key) {
  return openDb().then(
    (db) =>
      new Promise((resolve) => {
        if (!db) return resolve(undefined);
        try {
          const request = db
            .transaction(store, "readonly")
            .objectStore(store)
            .get(key);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => {
            console.error(`[signalStore] get ${store}/${key}:`, request.error);
            resolve(undefined);
          };
        } catch (err) {
          console.error(`[signalStore] get ${store}/${key} threw:`, err);
          resolve(undefined);
        }
      }),
  );
}

function txPut(store, key, value) {
  return openDb().then(
    (db) =>
      new Promise((resolve) => {
        if (!db) return resolve();
        try {
          const tx = db.transaction(store, "readwrite");
          tx.objectStore(store).put(value, key);
          tx.oncomplete = () => resolve();
          tx.onerror = () => {
            console.error(`[signalStore] put ${store}/${key}:`, tx.error);
            resolve();
          };
        } catch (err) {
          console.error(`[signalStore] put ${store}/${key} threw:`, err);
          resolve();
        }
      }),
  );
}

// Address format used everywhere: "<userId>.<deviceId>" — every
// (user, device) pair is a distinct Signal protocol address, which is
// what per-device sessions and per-device identity pins need.
export const addressFor = (userId, deviceId) => `${userId}.${deviceId}`;

/**
 * Build a SignalProtocolStore backed by IndexedDB. Satisfies the
 * storage interface libsignal-protocol expects (all methods return
 * promises; `Direction` constants live on the store itself).
 */
export async function createProtocolStore({ userId, deviceId }) {
  const libsignal = await loadLibsignal();

  const memory = {
    identityKeyPair: await txGet(STORES.META, "identityKeyPair"),
    registrationId: await txGet(STORES.META, "registrationId"),
    preKeyIdCounter: (await txGet(STORES.META, "preKeyIdCounter")) || 1,
    identityKeys: new Map(
      Object.entries((await txGet(STORES.META, "identityKeys")) || {}),
    ),
    sessions: new Map(Object.entries((await txGet(STORES.META, "sessions")) || {})),
    preKeys: new Map(Object.entries((await txGet(STORES.META, "preKeys")) || {})),
    signedPreKeys: new Map(
      Object.entries((await txGet(STORES.META, "signedPreKeys")) || {}),
    ),
  };

  const persistMap = (name, map) =>
    txPut(STORES.META, name, Object.fromEntries(map));

  const store = {
    Direction: { SENDING: 1, RECEIVING: 2 },

    getIdentityKeyPair: () => Promise.resolve(memory.identityKeyPair),
    getLocalRegistrationId: () => Promise.resolve(memory.registrationId),

    // ---- remote identities ----
    isTrustedIdentity: (identifier, identityKey) => {
      const known = memory.identityKeys.get(identifier);
      // Trust on first use; afterwards the key must never change.
      return Promise.resolve(
        known === undefined ||
          Uint8Array.from(known).toString() === Uint8Array.from(identityKey).toString(),
      );
    },
    saveIdentity: (identifier, identityKey) => {
      memory.identityKeys.set(identifier, identityKey);
      return persistMap("identityKeys", memory.identityKeys);
    },
    loadIdentityKey: (identifier) =>
      Promise.resolve(memory.identityKeys.get(identifier)),

    // ---- sessions (Double Ratchet state) ----
    loadSession: (identifier) => Promise.resolve(memory.sessions.get(identifier)),
    storeSession: (identifier, record) => {
      memory.sessions.set(identifier, record);
      return persistMap("sessions", memory.sessions);
    },

    // ---- one-time prekeys (consumed on use) ----
    loadPreKey: (preKeyId) => Promise.resolve(memory.preKeys.get(String(preKeyId))),
    storePreKey: (preKeyId, keyPair) => {
      memory.preKeys.set(String(preKeyId), keyPair);
      return persistMap("preKeys", memory.preKeys);
    },
    removePreKey: (preKeyId) => {
      memory.preKeys.delete(String(preKeyId));
      return persistMap("preKeys", memory.preKeys);
    },
    // The next key id we should generate for this device. A persistent
    // counter — reusing a consumed id would load the wrong key pair on
    // the receiving side and break decryption.
    nextPreKeyId: () => memory.preKeyIdCounter,
    bumpPreKeyIdCounter: (next) => {
      memory.preKeyIdCounter = Math.max(memory.preKeyIdCounter, next);
      return txPut(STORES.META, "preKeyIdCounter", memory.preKeyIdCounter);
    },

    // ---- signed prekeys ----
    loadSignedPreKey: (signedPreKeyId) =>
      Promise.resolve(memory.signedPreKeys.get(String(signedPreKeyId))),
    storeSignedPreKey: (signedPreKeyId, record) => {
      memory.signedPreKeys.set(String(signedPreKeyId), record);
      return persistMap("signedPreKeys", memory.signedPreKeys);
    },

    // ---- extra helpers used by the key manager (not part of the
    //      libsignal storage contract) ----
    hasIdentity: () => Boolean(memory.identityKeyPair && memory.registrationId),
    getIdentity: () => memory.identityKeyPair,
    getRegistrationIdValue: () => memory.registrationId,
    saveIdentityKeyPair: (identityKeyPair) => {
      memory.identityKeyPair = identityKeyPair;
      return txPut(STORES.META, "identityKeyPair", identityKeyPair);
    },
    saveRegistrationId: (registrationId) => {
      memory.registrationId = registrationId;
      return txPut(STORES.META, "registrationId", registrationId);
    },
    allSessionAddresses: () => [...memory.sessions.keys()],
    sessionExists: (identifier) => memory.sessions.has(identifier),
  };

  return { libsignal, store, userId, deviceId };
}

export default createProtocolStore;
