const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const redisConfig = require("./config/redis.config");

// Rate limiter for auth endpoints - configurable via env
const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000; // 15 minutes default
const limit = parseInt(process.env.RATE_LIMIT_MAX, 10) || 100; // 5 requests per window default

const options = {
  windowMs,
  limit,
  standardHeaders: true,
  legacyHeaders: false,
  // A store failure must never fail auth traffic: pass the request
  // through instead of erroring. A Redis outage degrades to weaker
  // limiting, not to broken endpoints.
  passOnStoreError: true,
};

// Start with the in-process store so the server is fully functional
// before — and without — Redis. Only once the Redis connection is
// confirmed ready do we swap to the Redis-backed store, so limits are
// then enforced across every Node instance behind the load balancer
// instead of being per-process. A configured-but-unreachable Redis
// never reaches this path (isRedisEnabled is true only after a
// confirmed connection), which is what prevents the per-request
// NOSCRIPT/max-retries error spam seen when it was built eagerly.
let active = rateLimit(options);

if (process.env.REDIS_URL) {
  redisConfig.whenReady().then((ready) => {
    if (!ready) return; // stay in-memory; index.js already warns
    try {
      const store = new RedisStore({
        sendCommand: (...args) => redisConfig.redis.call(...args),
      });
      active = rateLimit({ ...options, store });
      console.log("Rate limiting backed by Redis");
    } catch (err) {
      console.error("Redis rate-limit store unavailable, staying in-memory:", err.message);
    }
  });
}

// Delegating middleware so the store can be swapped in after startup.
function authLimiter(req, res, next) {
  return active(req, res, next);
}

module.exports = authLimiter;
