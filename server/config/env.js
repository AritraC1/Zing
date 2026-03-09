require("dotenv").config();

class ENV {
  static PORT = process.env.PORT || 3000;
  static DB_URL = process.env.DATABASE_URL;
  static REDIS = process.env.REDIS_URL;
  static JWT_SECRET_KEY = process.env.JWT_SECRET;
}

module.exports = ENV;
