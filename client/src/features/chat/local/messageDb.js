// Local IndexedDB message history.
//
// The Redux store holds only the messages for the current session;
// IndexedDB persists them across reloads and becomes the fast path for
// opening a chat (instant paint) and for paging back through older
// history without a network round-trip.
//
// Design notes:
//  - Only messages with a real server id/sequence_no are stored —
//    optimistic local echoes live in Redux only.
//  - Writes are upserts keyed by message id, so re-saving a page of
//    history (or an edited message) is idempotent.
//  - Every function degrades to a no-op when IndexedDB is unavailable
//    (tests, private-mode edge cases) — local history is an
//    optimization, never a correctness dependency.
//  - History per conversation is capped (pruneOldest) so the store
//    stays bounded.

const DB_NAME = "zing-chat";
const DB_VERSION = 1;

const MESSAGES_STORE = "messages";
const STATUSES_STORE = "statuses";

// Keep at most this many messages per conversation.
const MAX_MESSAGES_PER_CONVERSATION = 2000;

// Messages per page, mirroring the server's PAGE_SIZE.
export const LOCAL_PAGE_SIZE = 50;

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

        if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
          const store = db.createObjectStore(MESSAGES_STORE, {
            keyPath: "id",
          });
          // Compound index: [conversation_id, sequence_no] — one query
          // per conversation, ordered by the server's sequence.
          store.createIndex("by_conv_seq", ["conversation_id", "sequence_no"]);
        }

        if (!db.objectStoreNames.contains(STATUSES_STORE)) {
          db.createObjectStore(STATUSES_STORE, {
            keyPath: "conversation_id",
          });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.error("[messageDb] open failed:", request.error);
        resolve(null);
      };
    } catch (err) {
      console.error("[messageDb] open threw:", err);
      resolve(null);
    }
  });

  return dbPromise;
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Strip session-only fields (send status, optimistic ids) before
// persisting — a reload must never resurrect a half-sent message.
function sanitizeMessage(message) {
  const { sendStatus: _sendStatus, ...persisted } = message;
  return persisted;
}

function tx(db, storeName, mode) {
  return db.transaction(storeName, mode).objectStore(storeName);
}

// ---------------------------------------------------------------
// Reads
// ---------------------------------------------------------------

// The most recent `limit` messages for a conversation, oldest -> newest.
export async function loadRecentMessages(conversationId, limit = LOCAL_PAGE_SIZE) {
  const db = await openDb();
  if (!db || !conversationId) return [];

  try {
    const store = tx(db, MESSAGES_STORE, "readonly");
    const index = store.index("by_conv_seq");
    const range = IDBKeyRange.bound([conversationId, -Infinity], [conversationId, Infinity]);
    const all = await requestToPromise(index.getAll(range));

    const recent = all
      .sort((a, b) => (a.sequence_no ?? 0) - (b.sequence_no ?? 0))
      .slice(-limit);

    return recent;
  } catch (err) {
    console.error("[messageDb] loadRecentMessages:", err);
    return [];
  }
}

// The `limit` messages strictly older than `beforeSeq`, oldest -> newest.
export async function loadOlderMessages(conversationId, beforeSeq, limit = LOCAL_PAGE_SIZE) {
  const db = await openDb();
  if (!db || !conversationId || beforeSeq == null) return [];

  try {
    const store = tx(db, MESSAGES_STORE, "readonly");
    const index = store.index("by_conv_seq");
    const range = IDBKeyRange.bound([conversationId, -Infinity], [conversationId, beforeSeq], false, true);
    const older = await requestToPromise(index.getAll(range));

    return older
      .sort((a, b) => (a.sequence_no ?? 0) - (b.sequence_no ?? 0))
      .slice(-limit);
  } catch (err) {
    console.error("[messageDb] loadOlderMessages:", err);
    return [];
  }
}

// The persisted per-conversation status map (messageId -> userId -> ...).
export async function loadStatuses(conversationId) {
  const db = await openDb();
  if (!db || !conversationId) return null;

  try {
    const row = await requestToPromise(
      tx(db, STATUSES_STORE, "readonly").get(conversationId),
    );
    return row?.statuses || null;
  } catch (err) {
    console.error("[messageDb] loadStatuses:", err);
    return null;
  }
}

// ---------------------------------------------------------------
// Writes
// ---------------------------------------------------------------

// Upsert a batch of messages for a conversation (fire-and-forget safe).
// All store requests are chained from each other's success callbacks
// (never across an await boundary) so the readwrite transaction cannot
// auto-commit mid-sequence — Safari is strict about this.
export async function saveMessages(conversationId, messages) {
  const db = await openDb();
  if (!db || !conversationId || !Array.isArray(messages)) return;

  const persistable = messages.filter(
    (m) => m && m.id && m.sequence_no != null,
  );
  if (!persistable.length) return;

  return new Promise((resolve) => {
    try {
      const store = tx(db, MESSAGES_STORE, "readwrite");
      const index = store.index("by_conv_seq");
      const range = IDBKeyRange.bound(
        [conversationId, -Infinity],
        [conversationId, Infinity],
      );

      persistable.forEach((message) => {
        store.put({
          ...sanitizeMessage(message),
          conversation_id: message.conversation_id || conversationId,
        });
      });

      // Bounded growth: drop the oldest rows beyond the cap.
      const countRequest = index.count(range);
      countRequest.onsuccess = () => {
        const excess = countRequest.result - MAX_MESSAGES_PER_CONVERSATION;
        if (excess <= 0) return;

        let removed = 0;
        const cursorRequest = index.openCursor(range);
        cursorRequest.onsuccess = (event) => {
          const cursor = event.target.result;
          if (!cursor || removed >= excess) return;
          cursor.delete();
          removed += 1;
          cursor.continue();
        };
      };

      const { transaction } = store;
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => {
        console.error("[messageDb] saveMessages:", transaction.error);
        resolve();
      };
      transaction.onabort = () => resolve();
    } catch (err) {
      console.error("[messageDb] saveMessages:", err);
      resolve();
    }
  });
}

// Merge a partial patch into one stored message (edits, deletes,
// reactions, stars).
export async function patchMessage(conversationId, messageId, patch) {
  const db = await openDb();
  if (!db || !conversationId || !messageId || !patch) return;

  return new Promise((resolve) => {
    try {
      const store = tx(db, MESSAGES_STORE, "readwrite");
      const getRequest = store.get(messageId);

      getRequest.onsuccess = () => {
        const existing = getRequest.result;
        if (!existing || existing.conversation_id !== conversationId) return;
        store.put({ ...existing, ...patch });
      };

      const { transaction } = store;
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => {
        console.error("[messageDb] patchMessage:", transaction.error);
        resolve();
      };
      transaction.onabort = () => resolve();
    } catch (err) {
      console.error("[messageDb] patchMessage:", err);
      resolve();
    }
  });
}

// Persist a single status update (delivered/seen).
export async function saveStatus(conversationId, messageId, userId, status) {
  const db = await openDb();
  if (!db || !conversationId || !messageId || !userId) return;

  return new Promise((resolve) => {
    try {
      const store = tx(db, STATUSES_STORE, "readwrite");
      const getRequest = store.get(conversationId);

      getRequest.onsuccess = () => {
        const row = getRequest.result || {
          conversation_id: conversationId,
          statuses: {},
        };

        if (!row.statuses[messageId]) row.statuses[messageId] = {};
        row.statuses[messageId][userId] = {
          ...(row.statuses[messageId][userId] || {}),
          msg_status: status,
        };

        store.put(row);
      };

      const { transaction } = store;
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => {
        console.error("[messageDb] saveStatus:", transaction.error);
        resolve();
      };
      transaction.onabort = () => resolve();
    } catch (err) {
      console.error("[messageDb] saveStatus:", err);
      resolve();
    }
  });
}

export async function saveStatuses(conversationId, statuses) {
  const db = await openDb();
  if (!db || !conversationId || !statuses) return;

  try {
    const store = tx(db, STATUSES_STORE, "readwrite");
    store.put({ conversation_id: conversationId, statuses });
    await new Promise((resolve) => {
      const { transaction } = store;
      transaction.oncomplete = resolve;
      transaction.onerror = resolve;
      transaction.onabort = resolve;
    });
  } catch (err) {
    console.error("[messageDb] saveStatuses:", err);
  }
}

// Wipe everything (logout).
export async function clearAll() {
  const db = await openDb();
  if (!db) return;

  try {
    const transaction = db.transaction(
      [MESSAGES_STORE, STATUSES_STORE],
      "readwrite",
    );
    transaction.objectStore(MESSAGES_STORE).clear();
    transaction.objectStore(STATUSES_STORE).clear();
    await new Promise((resolve) => {
      transaction.oncomplete = resolve;
      transaction.onerror = resolve;
      transaction.onabort = resolve;
    });
  } catch (err) {
    console.error("[messageDb] clearAll:", err);
  }
}
