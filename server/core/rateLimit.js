const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const redisConfig = require("./config/redis.config");

// Rate limiter for auth endpoints - configurable via env
const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000; // 15 minutes default
const limit = parseInt(process.env.RATE_LIMIT_MAX, 10) || 100; // 5 requests per window default

// With Redis configured the counters live in Redis so the limit is
// enforced across every Node instance behind the load balancer instead
// of being per-process. Without Redis the default in-memory store is
// used (single instance behavior, unchanged).
const store = redisConfig.isRedisEnabled()
  ? new RedisStore({
      sendCommand: (...args) => redisConfig.redis.call(...args),
    })
  : undefined;

const limiter = rateLimit({
  windowMs,
  limit,
  ...(store ? { store } : {}),
  standardHeaders: true,
  legacyHeaders: false,
  // Trust proxy for correct IP detection behind nginx/load balancers
  // The main app will set app.set("trust proxy", 1)
});

module.exports = limiter;
