const db = require("../../core/config/db.config");

class PushRepository {
  // Attach (or replace) an FCM registration token on a device row.
  async setDevicePushToken({ deviceId, token, pushType }) {
    const query = `
      UPDATE devices
      SET push_token = $2,
          push_type = $3
      WHERE id = $1
      RETURNING id, push_token, push_type;
    `;

    const result = await db.query(query, [
      deviceId,
      token,
      pushType || "fcm",
    ]);
    return result.rows[0] || null;
  }

  // Remove a token (logout, or FCM reported it as unregistered).
  async clearDevicePushToken(deviceId) {
    const query = `
      UPDATE devices
      SET push_token = NULL,
          push_type = NULL
      WHERE id = $1;
    `;
    await db.query(query, [deviceId]);
  }

  // Every device of the user that can be woken up. Only devices with a
  // live token are returned; revoked devices are excluded.
  async getPushTargets(userId) {
    const query = `
      SELECT id, device_type, push_token, push_type
      FROM devices
      WHERE user_id = $1
        AND revoked = FALSE
        AND push_token IS NOT NULL;
    `;

    const result = await db.query(query, [userId]);
    return result.rows;
  }
}

module.exports = PushRepository;
