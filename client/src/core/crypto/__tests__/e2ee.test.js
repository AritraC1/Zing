// Integration test for the client E2EE layer.
//
// Runs the REAL libsignal-protocol (X3DH + Double Ratchet) against a
// fake prekey directory that mimics the server's key endpoints:
//   POST /auth/keys/register            -> store public key material
//   GET  /auth/keys/:userId             -> hand out prekey bundles
//   GET  /auth/keys/prekeys/count/:id   -> report unused one-time prekeys
//
// IndexedDB is unavailable under Node, so the protocol store degrades
// to its in-memory mode — which is exactly what we want here.

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../api/axiosInstance", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

import axiosInstance from "../../api/axiosInstance";
import * as keyManager from "../keyManager";
import * as signalService from "../signalService";
import {
  buildEnvelope,
  parseEnvelope,
  isEnvelope,
  ENVELOPE_PREFIX,
} from "../envelope";
import { decryptMessages } from "../../../features/chat/utils/e2ee";

// ------------------------------------------------------------------
// Fake prekey directory (the server's role in these tests)
// ------------------------------------------------------------------

const deviceRecords = new Map(); // deviceId -> { userId, payload, preKeys }
const userDevices = new Map(); // userId -> [deviceIds]

function registerHandler({ deviceId, ...payload }) {
  // Server semantics: replace unused one-time prekeys with the batch.
  deviceRecords.set(deviceId, { ...payload, preKeys: [...payload.preKeys] });
}

function bundleHandler(userId) {
  const deviceIds = userDevices.get(userId) || [];
  const bundles = deviceIds
    .map((deviceId) => {
      const record = deviceRecords.get(deviceId);
      if (!record) return null;
      const oneTimePreKey = record.preKeys.length
        ? record.preKeys.shift() // consumed by this fetch
        : null;
      return {
        deviceId,
        deviceType: "web",
        identityPublicKey: record.identityPublicKey,
        signedPreKey: {
          keyId: record.signedPreKeyId,
          publicKey: record.signedPreKeyPublic,
          signature: record.signedPreKeySignature,
        },
        oneTimePreKey,
        preKeyCount: record.preKeys.length,
      };
    })
    .filter(Boolean);

  return { success: true, data: { userId, bundles } };
}

beforeEach(() => {
  vi.clearAllMocks();
  deviceRecords.clear();
  userDevices.clear();
  keyManager.resetSignalContext();
  signalService.clearBundleCache();

  axiosInstance.post.mockImplementation(async (url, payload) => {
    if (url === "/auth/keys/register") {
      registerHandler(payload);
      return {
        data: {
          success: true,
          data: {
            deviceId: payload.deviceId,
            registered: true,
            preKeysUploaded: payload.preKeys.length,
            preKeyCount: payload.preKeys.length,
          },
        },
      };
    }
    throw new Error(`Unexpected POST ${url}`);
  });

  axiosInstance.get.mockImplementation(async (url) => {
    if (url.startsWith("/auth/keys/prekeys/count/")) {
      const deviceId = url.replace("/auth/keys/prekeys/count/", "");
      const record = deviceRecords.get(deviceId);
      return {
        data: { success: true, data: { deviceId, preKeyCount: record?.preKeys.length ?? 0 } },
      };
    }
    if (url.startsWith("/auth/keys/")) {
      const userId = url.replace("/auth/keys/", "");
      return { data: bundleHandler(userId) };
    }
    throw new Error(`Unexpected GET ${url}`);
  });
});

async function setupUser(userId, deviceId) {
  const ctx = await keyManager.initSignal(userId, deviceId);
  await keyManager.ensureKeysRegistered(userId, deviceId);
  userDevices.set(userId, [deviceId]);
  return ctx;
}

// ------------------------------------------------------------------
// Envelope format
// ------------------------------------------------------------------

describe("envelope format", () => {
  it("round-trips sender device id and entries", () => {
    const entries = {
      "device-a": { t: 3, b: "QUJD" },
      "device-b": { t: 1, b: "REVG" },
    };
    const envelope = buildEnvelope("sender-device", entries);

    expect(isEnvelope(envelope)).toBe(true);
    expect(envelope.startsWith(ENVELOPE_PREFIX)).toBe(true);

    const parsed = parseEnvelope(envelope);
    expect(parsed.senderDeviceId).toBe("sender-device");
    expect(parsed.entries).toEqual(entries);
  });

  it("treats non-envelope content as plaintext", () => {
    expect(isEnvelope("hello")).toBe(false);
    expect(parseEnvelope("hello")).toBeNull();
  });

  it("rejects malformed envelopes", () => {
    expect(parseEnvelope(ENVELOPE_PREFIX + "!!!not-base64!!!")).toBeNull();
    expect(parseEnvelope(ENVELOPE_PREFIX + btoa(JSON.stringify({ nope: 1 })))).toBeNull();
  });
});

// ------------------------------------------------------------------
// Full X3DH + Double Ratchet round trip
// ------------------------------------------------------------------

describe("signalService round trip", () => {
  it("encrypts for all devices and decrypts on the recipient", async () => {
    const aliceCtx = await setupUser("alice-user", "alice-device");
    const bobCtx = await setupUser("bob-user", "bob-device");

    const envelope = await signalService.encryptDirect(
      "bob-user",
      "hello zing",
      { ctx: aliceCtx },
    );

    expect(isEnvelope(envelope)).toBe(true);

    // Bob's device entry exists in the envelope.
    const parsed = parseEnvelope(envelope);
    expect(Object.keys(parsed.entries)).toEqual(
      expect.arrayContaining(["bob-device", "alice-device"]),
    );

    const plaintext = await signalService.decryptDirect(
      "alice-user",
      envelope,
      { ctx: bobCtx },
    );
    expect(plaintext).toBe("hello zing");
  });

  it("lets the sender read their own message back (self entry)", async () => {
    const aliceCtx = await setupUser("alice-user", "alice-device");
    await setupUser("bob-user", "bob-device");

    const envelope = await signalService.encryptDirect(
      "bob-user",
      "note to self",
      { ctx: aliceCtx },
    );

    const selfPlaintext = await signalService.decryptDirect(
      "alice-user",
      envelope,
      { ctx: aliceCtx },
    );
    expect(selfPlaintext).toBe("note to self");
  });

  it("ratchets across multiple messages in both directions", async () => {
    const aliceCtx = await setupUser("alice-user", "alice-device");
    const bobCtx = await setupUser("bob-user", "bob-device");

    const decrypt = (senderId, envelope, ctx) =>
      signalService.decryptDirect(senderId, envelope, { ctx });

    const m1 = await signalService.encryptDirect("bob-user", "msg 1", { ctx: aliceCtx });
    expect(await decrypt("alice-user", m1, bobCtx)).toBe("msg 1");

    const r1 = await signalService.encryptDirect("alice-user", "pong 1", { ctx: bobCtx });
    expect(await decrypt("bob-user", r1, aliceCtx)).toBe("pong 1");

    // After Bob's first reply the PreKey handshake is consumed; from
    // here messages are plain Double Ratchet (type 1).
    const m2 = await signalService.encryptDirect("bob-user", "msg 2", { ctx: aliceCtx });
    expect(parseEnvelope(m2).entries["bob-device"].t).toBe(1);
    expect(await decrypt("alice-user", m2, bobCtx)).toBe("msg 2");

    const m3 = await signalService.encryptDirect("bob-user", "msg 3", { ctx: aliceCtx });
    expect(await decrypt("alice-user", m3, bobCtx)).toBe("msg 3");

    const r2 = await signalService.encryptDirect("alice-user", "pong 2", { ctx: bobCtx });
    expect(await decrypt("bob-user", r2, aliceCtx)).toBe("pong 2");
  });

  it("decrypts a batch of history messages", async () => {
    const aliceCtx = await setupUser("alice-user", "alice-device");
    const bobCtx = await setupUser("bob-user", "bob-device");

    const env = await signalService.encryptDirect("bob-user", "history hit", {
      ctx: aliceCtx,
    });

    const messages = [
      { sender_id: "alice-user", content: env },
      { sender_id: "bob-user", content: "plain group message" },
      { sender_id: "alice-user", content: "zingenc:v1:brokenbase64" },
    ];

    const decrypted = await decryptMessages(messages, { ctx: bobCtx });

    expect(decrypted[0].content).toBe("history hit");
    expect(decrypted[1].content).toBe("plain group message");
    // Undecryptable envelope -> locked placeholder, never ciphertext.
    expect(decrypted[2].content).toMatch(/Encrypted message/);
  });

  it("returns null for an envelope with no entry for this device", async () => {
    const aliceCtx = await setupUser("alice-user", "alice-device");
    await setupUser("bob-user", "bob-device");

    const envelope = await signalService.encryptDirect(
      "bob-user",
      "not for you",
      { ctx: aliceCtx },
    );

    // A third user has no entry in the envelope.
    const malloryCtx = await keyManager.initSignal("mallory-user", "mallory-device");
    const result = await signalService.decryptDirect("alice-user", envelope, {
      ctx: malloryCtx,
    });
    expect(result).toBeNull();
  });

  it("fails closed when the peer has no keyed devices", async () => {
    const aliceCtx = await setupUser("alice-user", "alice-device");
    userDevices.set("legacy-user", []); // pre-upgrade account

    await expect(
      signalService.encryptDirect("legacy-user", "hi", { ctx: aliceCtx }),
    ).rejects.toThrow(/No keyed devices/);
  });
});
