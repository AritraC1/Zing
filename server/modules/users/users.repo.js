const db = require("../../config/db");

class UserRepo {
  // Find a user by phone number
  static async findByPhone(phone_number) {
    const query = `SELECT * FROM users WHERE phone_number = $1`;

    const result = await db.query(query, [phone_number]);
    return result.rows[0];
  }

  // Create a new user
  static async createUser(phone_number) {
    const query = `
    INSERT INTO users (phone_number)
    VALUES ($1)
    RETURNING *
    `;

    const result = await db.query(query, [phone_number]);
    return result.rows[0];
  }

  // Update user details
  static async updateUser(id, displayName) {
    const query = `
    UPDATE users 
    SET display_name = $1
    WHERE id = $2
  `;

    await db.query(query, [displayName, id]);
  }

  // Delete a user by phone number
  static async deleteUserByPhoneNumber(phone_number) {
    const query = `DELETE FROM users where phone_number = $1`;

    const result = await db.query(query, [phone_number]);
    return result.rowCount;
  }
}

module.exports = UserRepo;
