const KeysService = require("../keys.service");
const AppError = require("../../../core/errors/AppError");
const chatEvents = require("../../chat/chat.events");

jest.mock("../../device/device.repository");
jest.mock("../../device/devicePrekeys.repository");
jest.mock("../../chat/chat.events");

const KEYED_DEVICE = {
  id: "device-1",
  user_id: "user-1",
  device_type: "web",
  revoked: false,
  identity_public_key: "aWQtcHVia2V5",
  signed_prekey_id: 1,
  signed_prekey_public: "c2lnbmVkLXByZWtleQ==",
  signed_prekey_signature: "c2ln",
};

const RAW_DEVICE = { ...KEYED_DEVICE, id: "device-legacy", identity_public_key: null };

describe("KeysService", () => {
  let keysService;
  let deviceRepo;
  let preKeyRepo;

  const REGISTER_PAYLOAD = {
    deviceId: "device-1",
    identityPublicKey: "aWQtcHVia2V5",
    signedPreKeyId: 1,
    signedPreKeyPublic: "c2lnbmVkLXByZWtleQ==",
    signedPreKeySignature: "c2ln",
    preKeys: [
      { keyId: 101, publicKey: "b25ldGltZS0x" },
      { keyId: 102, publicKey: "b25ldGltZS0y" },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    keysService = new KeysService();
    deviceRepo = keysService.deviceRepo;
    preKeyRepo = keysService.preKeyRepo;
    deviceRepo.findById.mockResolvedValue({ ...KEYED_DEVICE });
    deviceRepo.updateKeys.mockResolvedValue({ id: "device-1" });
    deviceRepo.findByUserId.mockResolvedValue([{ ...KEYED_DEVICE }]);
    deviceRepo.findByUserId.mockResolvedValue([{ ...KEYED_DEVICE }]);
    preKeyRepo.replaceUnused.mockResolvedValue(2);
    preKeyRepo.consumeOne.mockResolvedValue({ key_id: 101, public_key: "b25ldGltZS0x" });
    preKeyRepo.countUnused.mockResolvedValue(99);
  });

  describe("registerKeys", () => {
    it("stores key material and replaces unused prekeys", async () => {
      const result = await keysService.registerKeys({
        userId: "user-1",
        ...REGISTER_PAYLOAD,
      });

      expect(deviceRepo.updateKeys).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: "device-1",
          userId: "user-1",
          identityPublicKey: "aWQtcHVia2V5",
          signedPreKeyId: 1,
        }),
      );
      expect(preKeyRepo.replaceUnused).toHaveBeenCalledWith(
        "device-1",
        REGISTER_PAYLOAD.preKeys,
      );
      expect(result).toEqual({
        deviceId: "device-1",
        registered: true,
        preKeysUploaded: 2,
        preKeyCount: 99,
      });
    });

    it("throws 404 when the device does not exist", async () => {
      deviceRepo.findById.mockResolvedValueOnce(null);

      await expect(
        keysService.registerKeys({ userId: "user-1", ...REGISTER_PAYLOAD }),
      ).rejects.toMatchObject({ statusCode: 404 });
      expect(deviceRepo.updateKeys).not.toHaveBeenCalled();
    });

    it("throws 403 when the device belongs to another account", async () => {
      deviceRepo.findById.mockResolvedValueOnce({ ...KEYED_DEVICE, user_id: "someone-else" });

      await expect(
        keysService.registerKeys({ userId: "user-1", ...REGISTER_PAYLOAD }),
      ).rejects.toMatchObject({ statusCode: 403 });
      expect(deviceRepo.updateKeys).not.toHaveBeenCalled();
    });
  });

  describe("getPreKeyBundles", () => {
    it("builds a bundle per keyed device and consumes one one-time prekey", async () => {
      const result = await keysService.getPreKeyBundles({
        userId: "user-1",
        requesterUserId: "user-2",
      });

      expect(preKeyRepo.consumeOne).toHaveBeenCalledWith("device-1");
      expect(result.bundles).toHaveLength(1);
      expect(result.bundles[0]).toMatchObject({
        deviceId: "device-1",
        identityPublicKey: "aWQtcHVia2V5",
        signedPreKey: {
          keyId: 1,
          publicKey: "c2lnbmVkLXByZWtleQ==",
          signature: "c2ln",
        },
        oneTimePreKey: { keyId: 101, publicKey: "b25ldGltZS0x" },
        preKeyCount: 99,
      });
    });

    it("skips revoked and unkeyed devices", async () => {
      deviceRepo.findByUserId.mockResolvedValueOnce([
        { ...KEYED_DEVICE, revoked: true },
        RAW_DEVICE,
        { ...KEYED_DEVICE, id: "device-2" },
      ]);

      const result = await keysService.getPreKeyBundles({
        userId: "user-1",
        requesterUserId: "user-2",
      });

      expect(result.bundles).toHaveLength(1);
      expect(result.bundles[0].deviceId).toBe("device-2");
    });

    it("returns a bundle without a one-time prekey when none remain", async () => {
      preKeyRepo.consumeOne.mockResolvedValueOnce(null);

      const result = await keysService.getPreKeyBundles({
        userId: "user-1",
        requesterUserId: "user-2",
      });

      expect(result.bundles[0].oneTimePreKey).toBeNull();
    });

    it("throws 404 when the user has no keyed devices", async () => {
      deviceRepo.findByUserId.mockResolvedValueOnce([]);
      await expect(
        keysService.getPreKeyBundles({ userId: "user-1", requesterUserId: "user-2" }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("throws 404 when every device is unkeyed", async () => {
      deviceRepo.findByUserId.mockResolvedValueOnce([RAW_DEVICE]);
      await expect(
        keysService.getPreKeyBundles({ userId: "user-1", requesterUserId: "user-2" }),
      ).rejects.toBeInstanceOf(AppError);
    });

    it("emits keys:low to the key owner when a device falls below the threshold", async () => {
      preKeyRepo.countUnused.mockResolvedValueOnce(5).mockResolvedValueOnce(5);

      await keysService.getPreKeyBundles({
        userId: "user-1",
        requesterUserId: "user-2",
      });

      expect(chatEvents.notifyEvent).toHaveBeenCalledWith(
        "keys:low",
        expect.objectContaining({ userId: "user-1", deviceIds: ["device-1"] }),
        ["user-1"],
      );
    });

    it("does not emit keys:low to the requester's own fetch", async () => {
      preKeyRepo.countUnused.mockResolvedValueOnce(5).mockResolvedValueOnce(5);

      await keysService.getPreKeyBundles({
        userId: "user-1",
        requesterUserId: "user-1",
      });

      expect(chatEvents.notifyEvent).not.toHaveBeenCalled();
    });
  });

  describe("getPreKeyCount", () => {
    it("returns the unused prekey count for the caller's device", async () => {
      const result = await keysService.getPreKeyCount({
        userId: "user-1",
        deviceId: "device-1",
      });

      expect(result).toEqual({ deviceId: "device-1", preKeyCount: 99 });
    });

    it("throws 403 for another user's device", async () => {
      deviceRepo.findById.mockResolvedValueOnce({ ...KEYED_DEVICE, user_id: "someone-else" });

      await expect(
        keysService.getPreKeyCount({ userId: "user-1", deviceId: "device-1" }),
      ).rejects.toMatchObject({ statusCode: 403 });
    });
  });
});
