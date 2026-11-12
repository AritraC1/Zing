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
  async createDevice({id, userId, deviceType, identityPublicKey = null}, client) {
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

    if (client) {
      const result = await client.query(query, values);
      return result.rows[0];
    }

    const result = await db.query(query, values);

    return result.rows[0];
  }

  // Persist Signal protocol key material for a device (identity key
  // plus the current signed prekey). Used by the key service when a
  // client uploads its prekey bundle.
  async updateKeys(
    {
      deviceId,
      userId,
      identityPublicKey,
      signedPreKeyId,
      signedPrekeyPublic,
      signedPrekeySignature,
    },
    client,
  ) {
    const query = `
      UPDATE devices
      SET identity_public_key = $3,
          signed_prekey_id = $4,
          signed_prekey_public = $5,
          signed_prekey_signature = $6,
          last_seen_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING id, identity_public_key, signed_prekey_id
    `;

    const values = [
      deviceId,
      userId,
      identityPublicKey,
      signedPreKeyId,
      signedPrekeyPublic,
      signedPrekeySignature,
    ];

    if (client) {
      const result = await client.query(query, values);
      return result.rows[0];
    }

    const result = await db.query(query, values);

    return result.rows[0];
  }
}

module.exports = DeviceRepository;
