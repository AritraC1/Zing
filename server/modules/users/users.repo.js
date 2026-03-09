const pool = require("../../config/db");

class UserRepo {
  // Find a user by phone number
  static async findByPhone(phone_number) {
    const result = await pool.query(
      `SELECT * FROM users WHERE phone_number = $1`,
      [phone_number],
    );
    return result.rows[0];
  }

  // Create a new user
  static async createUser(phone_number) {
    const result = await pool.query(
      `
        INSERT INTO users (phone_number)
        VALUES ($1)
        RETURNING *
        `,
      [phone_number],
    );

    return result.rows[0];
  }
}

module.exports = UserRepo;
