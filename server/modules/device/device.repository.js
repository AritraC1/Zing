const { validate: uuidValidate } = require("uuid");
const db = require("../../core/config/db.config");

class DeviceRepository {
  // Find device by device id
  async findById(id) {
    // Validate id
    if (!uuidValidate(id)) {
      return null;
    }

    const query = `
        SELECT *
        FROM devices
        WHERE id = $1
    `;

    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Find a device by user_id
  async findByUserId(user_id) {
    const query = `
        SELECT * 
        FROM devices
        WHERE user_id = $1
        `;

    const result = await db.query(query, [user_id]);
    return result.rows;
  }

  // Create a new device
  async createDevice(
    { id, userId, deviceType, identityPublicKey },
    client = db,
  ) {
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
    const result = await client.query(query, values);

    return result.rows[0];
  }
}

module.exports = DeviceRepository;
