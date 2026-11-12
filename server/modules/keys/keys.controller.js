const { parseBody } = require("../../core/validation/parseBody");
const { registerKeysSchema } = require("../../core/validation/schemas");
const KeysService = require("./keys.service");

class KeysController {
  constructor(keysService = new KeysService()) {
    this.keysService = keysService;
  }

  // POST /api/auth/keys/register
  registerKeys = async (req, res, next) => {
    try {
      const data = parseBody(registerKeysSchema, req.body);

      const result = await this.keysService.registerKeys({
        userId: req.user.id,
        ...data,
      });

      res.status(200).json({
        success: true,
        message: "Key material registered",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/auth/keys/:userId — prekey bundles for every keyed device
  getPreKeyBundles = async (req, res, next) => {
    try {
      const result = await this.keysService.getPreKeyBundles({
        userId: req.params.userId,
        requesterUserId: req.user.id,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/auth/keys/prekeys/count/:deviceId
  getPreKeyCount = async (req, res, next) => {
    try {
      const result = await this.keysService.getPreKeyCount({
        userId: req.user.id,
        deviceId: req.params.deviceId,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}

const keysController = new KeysController();

module.exports = { KeysController, keysController };
