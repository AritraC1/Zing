const { rateLimit } = require("express-rate-limit");

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // Limit each IP to 5 requests per `window` (here, per 15 minutes).
});

module.exports = limiter;
