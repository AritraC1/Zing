const db = require("../../core/config/db.config");

class UserRepository {
  // Find a user by phone number
  async findByPhone(phoneNumber) {
    const query = `SELECT * FROM users WHERE phone_number = $1`;

    const result = await db.query(query, [phoneNumber]);
    return result.rows[0];
  }

  // Find a user by phone number with avatar storage key
  async findByPhoneWithAvatar(phoneNumber) {
    const query = `
      SELECT u.*, m.storage_key AS avatar_storage_key
      FROM users u
      LEFT JOIN media m ON u.avatar_media_id = m.id
      WHERE u.phone_number = $1
    `;

    const result = await db.query(query, [phoneNumber]);
    return result.rows[0];
  }

  // Find a user by id with avatar storage key
  async findByIdWithAvatar(id) {
    const query = `
      SELECT u.*, m.storage_key AS avatar_storage_key
      FROM users u
      LEFT JOIN media m ON u.avatar_media_id = m.id
      WHERE u.id = $1
    `;

    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Create a new user
  async createUser(phoneNumber) {
    const query = `
    INSERT INTO users (phone_number)
    VALUES ($1)
    RETURNING *
    `;

    const result = await db.query(query, [phoneNumber]);
    return result.rows[0];
  }

  // Complete User profile
  async completeProfileById(id, displayName) {
    const query = `
    UPDATE users
     SET display_name = $1,
        profile_completed = true
      WHERE id = $2
    RETURNING *
    `;

    const result = await db.query(query, [displayName, id]);
    return result.rows[0];
  }

  // Update user details
  async updateUser(id, displayName) {
    const query = `
    UPDATE users
    SET display_name = $1,
        updated_at = NOW()
    WHERE id = $2
    RETURNING *
  `;

    const result = await db.query(query, [displayName, id]);
    return result.rows[0];
  }

  // Set avatar media id on user
  async setAvatarMediaId(userId, mediaId) {
    const query = `
      UPDATE users
      SET avatar_media_id = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    const result = await db.query(query, [mediaId, userId]);
    return result.rows[0];
  }

  // Delete a user by id
  async deleteUserById(id) {
    const query = `DELETE FROM users WHERE id = $1`;

    const result = await db.query(query, [id]);
    return result.rowCount;
  }

  // Delete a user by phone number
  async deleteUserByPhoneNumber(phone_number) {
    const query = `DELETE FROM users where phone_number = $1`;

    const result = await db.query(query, [phone_number]);
    return result.rowCount;
  }

  async updateLastSeen(userId) {
    const query = `
      UPDATE users
      SET last_seen_at = NOW(), updated_at = NOW()
      WHERE id = $1
      RETURNING last_seen_at
    `;

    const result = await db.query(query, [userId]);
    return result.rows[0]?.last_seen_at;
  }

  async completeProfileByIdWithClient(id, displayName) {
    const query = `
    UPDATE users
     SET display_name = $1,
        profile_completed = true
      WHERE id = $2
    RETURNING *
    `;

    const result = await db.query(query, [displayName, id]);
    return result.rows[0];
  }
}

module.exports = UserRepository;
