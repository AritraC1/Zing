require("dotenv").config();

const required = [
  "DATABASE_URL",
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(
    `Missing required environment variables: ${missing.join(", ")}`,
  );
  process.exit(1);
}

class ENV {
  // Port
  static PORT = process.env.PORT || 3000;

  // DB & Redis
  static DB_URL = process.env.DATABASE_URL;
  // Optional. When unset (or unreachable) the app degrades to the
  // in-process presence registry and in-memory rate limiting so single
  // instance deployments and tests keep working unchanged.
  static REDIS_URL = process.env.REDIS_URL || null;

  // JWT
  static JWT_SECRET_KEY = process.env.JWT_SECRET;
  static JWT_REFRESH_SECRET_KEY = process.env.JWT_REFRESH_SECRET;

  // Cloudinary
  static CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
  static CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
  static CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
}

module.exports = ENV;
