require("dotenv").config();

class ENV {
  // Port
  static PORT = process.env.PORT || 3000;
  
  // DB & Redis
  static DB_URL = process.env.DATABASE_URL;
  static REDIS = process.env.REDIS_URL;
  
  // JWT
  static JWT_SECRET_KEY = process.env.JWT_SECRET;
  static JWT_REFRESH_SECRET_KEY = process.env.JWT_REFRESH_SECRET;

  // Cloudinary
  static CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
  static CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
  static CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
}

module.exports = ENV;
