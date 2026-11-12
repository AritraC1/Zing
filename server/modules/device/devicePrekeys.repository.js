const crypto = require("crypto");
const db = require("../../core/config/db.config");
const { withTransaction } = require("../../utils/withTransaction");

// One-time prekeys for Signal protocol devices. The server only ever
// stores public keys: a bundle fetch hands out at most one unused key
// per device and immediately marks it used, so a key is never served
// twice (the classic single-use X3DH one-time prekey guarantee).
class DevicePreKeyRepository {
  // Bulk-insert a freshly generated batch of one-time prekey public keys
  async createBatch(deviceId, preKeys, client) {
    if (!Array.isArray(preKeys) || preKeys.length === 0) return 0;

    const values = [];
    const placeholders = preKeys
      .map((preKey, index) => {
        values.push(crypto.randomUUID(), deviceId, preKey.keyId, preKey.publicKey);
        const base = index * 4;
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
      })
      .join(", ");

    const query = `
      INSERT INTO device_prekeys (id, device_id, key_id, public_key)
      VALUES ${placeholders}
    `;

    if (client) {
      const result = await client.query(query, values);
      return result.rowCount;
    }

    const result = await db.query(query, values);
    return result.rowCount;
  }

  // Replace every unused one-time prekey of a device with a new batch.
  // Used keys stay around for late-arriving session attempts to inspect.
  async replaceUnused(deviceId, preKeys, client) {
    const deleteQuery = `DELETE FROM device_prekeys WHERE device_id = $1 AND is_used = FALSE`;
    if (client) {
      await client.query(deleteQuery, [deviceId]);
      return this.createBatch(deviceId, preKeys, client);
    }

    return withTransaction(async (dbClient) => {
      await dbClient.query(deleteQuery, [deviceId]);
      return this.createBatch(deviceId, preKeys, dbClient);
    });
  }

  // Atomically claim one unused prekey for a device. Returns the claimed
  // row or null when the device has no unused prekeys left.
  async consumeOne(deviceId, client) {
    const query = `
      UPDATE device_prekeys
      SET is_used = TRUE
      WHERE id = (
        SELECT id
        FROM device_prekeys
        WHERE device_id = $1 AND is_used = FALSE
        ORDER BY key_id ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING key_id, public_key
    `;

    if (client) {
      const result = await client.query(query, [deviceId]);
      return result.rows[0] || null;
    }

    const result = await db.query(query, [deviceId]);
    return result.rows[0] || null;
  }

  // How many unused one-time prekeys a device still has stored.
  async countUnused(deviceId, client) {
    const query = `
      SELECT COUNT(*)::int AS count
      FROM device_prekeys
      WHERE device_id = $1 AND is_used = FALSE
    `;

    if (client) {
      const result = await client.query(query, [deviceId]);
      return result.rows[0].count;
    }

    const result = await db.query(query, [deviceId]);
    return result.rows[0].count;
  }

  // Drop a device's prekeys entirely (device revocation / account deletion).
  async deleteAllForDevice(deviceId, client) {
    const query = `DELETE FROM device_prekeys WHERE device_id = $1`;

    if (client) {
      await client.query(query, [deviceId]);
      return;
    }

    await db.query(query, [deviceId]);
  }
}

module.exports = DevicePreKeyRepository;
