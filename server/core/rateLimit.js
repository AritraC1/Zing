const { rateLimit } = require("express-rate-limit");

// Rate limiter for auth endpoints - configurable via env
const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000; // 15 minutes default
const limit = parseInt(process.env.RATE_LIMIT_MAX, 10) || 5; // 5 requests per window default

const limiter = rateLimit({
  windowMs,
  limit,
  standardHeaders: true,
  legacyHeaders: false,
  // Trust proxy for correct IP detection behind nginx/load balancers
  // The main app will set app.set("trust proxy", 1)
});

module.exports = limiter;
