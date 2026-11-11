const pushService = require("./push.service");
const { validate: uuidValidate } = require("uuid");

class NotificationsController {
  // POST /api/notifications/register
  // Called by the web client after it obtains an FCM registration token.
  // The token is bound to the device record created at verify-otp.
  registerToken = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { token, deviceId, platform } = req.body || {};

      if (!token || typeof token !== "string") {
        return res.status(400).json({ message: "token is required" });
      }

      if (!deviceId || !uuidValidate(deviceId)) {
        return res.status(400).json({
          message: "deviceId must be a valid UUID",
        });
      }

      const result = await pushService.registerToken({
        userId,
        deviceId,
        token,
        platform: platform || "fcm",
      });

      if (!result.registered) {
        return res.status(400).json({ message: result.reason });
      }

      return res.status(200).json({ registered: true });
    } catch (error) {
      next(error);
    }
  };
}

const notificationsController = new NotificationsController();

module.exports = { NotificationsController, notificationsController };
