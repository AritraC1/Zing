const db = require("../../core/config/db.config");

class DeviceRepository {
  // Find device by device id
  async findById(id) {
    const query = `
        SELECT *
        FROM devices
        WHERE id = $1
    `;

    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Find a device by user_id
  async findByUserId(userId) {
    const query = `
        SELECT * 
        FROM devices
        WHERE user_id = $1
        `;

    const result = await db.query(query, [userId]);
    return result.rows;
  }

  // Create a new device
  async createDevice({id, userId, deviceType, identityPublicKey}) {
    const query = `
      INSERT INTO devices (
          id, 
          user_id, 
          device_type, 
          identity_public_key
      )
      VALUES ($1,$2,$3,$4)
      RETURNING *
    `;

    const values = [id, userId, deviceType, identityPublicKey];
    const result = await db.query(query, values);

    return result.rows[0];
  }
}

module.exports = DeviceRepository;
