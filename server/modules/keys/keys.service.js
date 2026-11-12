const AppError = require("../../core/errors/AppError");
const DeviceRepository = require("../device/device.repository");
const DevicePreKeyRepository = require("../device/devicePrekeys.repository");
const chatEvents = require("../chat/chat.events");

// When a device falls below this many unused one-time prekeys the
// server emits `keys:low` so the client can replenish its batch.
const PREKEY_LOW_THRESHOLD = 25;

class KeysService {
  constructor() {
    this.deviceRepo = new DeviceRepository();
    this.preKeyRepo = new DevicePreKeyRepository();
  }

  // Store a device's Signal protocol key material: identity key, current
  // signed prekey, and a batch of one-time prekey public keys. The
  // private keys never leave the client — the server is a dumb
  // directory, exactly like Signal's prekey server.
  async registerKeys({
    userId,
    deviceId,
    identityPublicKey,
    signedPreKeyId,
    signedPreKeyPublic,
    signedPreKeySignature,
    preKeys,
  }) {
    const device = await this.deviceRepo.findById(deviceId);

    if (!device) {
      throw new AppError("Device not found", 404);
    }

    if (String(device.user_id) !== String(userId)) {
      throw new AppError("Device belongs to another account", 403);
    }

    await this.deviceRepo.updateKeys({
      deviceId,
      userId,
      identityPublicKey,
      signedPreKeyId,
      signedPrekeyPublic: signedPreKeyPublic,
      signedPrekeySignature: signedPreKeySignature,
    });

    // A fresh registration replaces any prekeys that were never handed
    // out; already-used keys are kept so late session attempts can be
    // identified rather than silently double-served.
    await this.preKeyRepo.replaceUnused(deviceId, preKeys);

    const remaining = await this.preKeyRepo.countUnused(deviceId);

    return {
      deviceId,
      registered: true,
      preKeysUploaded: preKeys.length,
      preKeyCount: remaining,
    };
  }

  // Prekey bundles for every keyed device of a user. This is what an
  // initiator fetches to run X3DH. One unused one-time prekey is
  // consumed per device per call; when none remain the bundle comes
  // back without one and the initiator falls back to the signed prekey.
  async getPreKeyBundles({ userId, requesterUserId }) {
    const devices = await this.deviceRepo.findByUserId(userId);

    if (!devices || devices.length === 0) {
      throw new AppError("User not found", 404);
    }

    const bundles = [];
    let anyKeyed = false;
    let lowDevices = [];

    for (const device of devices) {
      if (device.revoked || !device.identity_public_key) continue;

      anyKeyed = true;

      // Consuming inside a transaction keeps concurrent bundle fetches
      // from handing the same one-time prekey to two initiators.
      const oneTime = await this.preKeyRepo.consumeOne(device.id);
      const preKeyCount = await this.preKeyRepo.countUnused(device.id);

      if (preKeyCount < PREKEY_LOW_THRESHOLD) {
        lowDevices.push(device.id);
      }

      bundles.push({
        deviceId: device.id,
        deviceType: device.device_type,
        identityPublicKey: device.identity_public_key,
        signedPreKey: {
          keyId: device.signed_prekey_id,
          publicKey: device.signed_prekey_public,
          signature: device.signed_prekey_signature,
        },
        oneTimePreKey: oneTime
          ? { keyId: oneTime.key_id, publicKey: oneTime.public_key }
          : null,
        preKeyCount,
      });
    }

    if (!anyKeyed) {
      throw new AppError("No keys registered for this user", 404);
    }

    // Tell the key owner (not the requester) that prekeys are running
    // low so their client can upload a fresh batch.
    if (lowDevices.length > 0 && String(userId) !== String(requesterUserId)) {
      chatEvents.notifyEvent(
        "keys:low",
        { userId, deviceIds: lowDevices, threshold: PREKEY_LOW_THRESHOLD },
        [userId],
      );
    }

    return { userId, bundles };
  }

  // How many unused one-time prekeys one of the caller's devices has.
  async getPreKeyCount({ userId, deviceId }) {
    const device = await this.deviceRepo.findById(deviceId);

    if (!device) {
      throw new AppError("Device not found", 404);
    }

    if (String(device.user_id) !== String(userId)) {
      throw new AppError("Device belongs to another account", 403);
    }

    return { deviceId, preKeyCount: await this.preKeyRepo.countUnused(deviceId) };
  }
}

KeysService.PREKEY_LOW_THRESHOLD = PREKEY_LOW_THRESHOLD;

module.exports = KeysService;
