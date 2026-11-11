require("dotenv").config();

const ENV = require("./env");

// Optional Redis layer used for:
//   - Socket.IO pub/sub adapter (fan-out across multiple Node instances)
//   - Presence registry with TTL (online keys expire if a node dies)
//   - Distributed rate limiting
//
// When REDIS_URL is unset the module exposes null clients and
// `isRedisEnabled === false`; every consumer (presence, rate limiter,
// index.js) falls back to the in-process implementation so single
// instance deployments, docker-compose without redis, and jest all
// keep working unchanged.

let redis = null; // shared client (commands)
let redisPub = null; // adapter publisher
let redisSub = null; // adapter subscriber
let connectionErrorLogged = false;

function createClient() {
  // Lazy require so jest environments without the dependency installed
  // still load modules that reference this file.
  const Redis = require("ioredis");

  const client = new Redis(ENV.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 2,
    retryStrategy(times) {
      // Back off but never give up entirely; presence keys carry a TTL
      // so a short outage only degrades online reporting.
      return Math.min(times * 500, 5000);
    },
  });

  client.on("error", (err) => {
    if (!connectionErrorLogged) {
      connectionErrorLogged = true;
      console.error("Redis error (continuing with degraded behavior):", err.message);
    }
  });

  return client;
}

if (ENV.REDIS_URL) {
  try {
    redis = createClient();
    redisPub = createClient();
    redisSub = createClient();

    redis.connect().catch((err) => {
      console.error("Redis connect failed:", err.message);
    });
    redisPub.connect().catch((err) => {
      console.error("Redis pub connect failed:", err.message);
    });
    redisSub.connect().catch((err) => {
      console.error("Redis sub connect failed:", err.message);
    });
  } catch (err) {
    console.error("Failed to initialize Redis clients:", err.message);
    redis = null;
    redisPub = null;
    redisSub = null;
  }
}

const isRedisEnabled = () => Boolean(redis && redis.status !== "end");

// Awaitable readiness check: resolves true once the shared client is
// connected, false when Redis is disabled or failed to come up.
// connect() throws if a client is already connecting/connected, so
// only connect clients that are still idle ("wait").
async function whenReady() {
  if (!ENV.REDIS_URL || !redis) return false;
  try {
    const clients = [redis, redisPub, redisSub];
    await Promise.all(
      clients
        .filter((client) => client.status === "wait")
        .map((client) => client.connect()),
    );
    await Promise.all(
      clients.map(async (client) => {
        if (client.status !== "ready") {
          await new Promise((resolve, reject) => {
            const onReady = () => resolve();
            const onError = (err) => {
              client.off("ready", onReady);
              reject(err);
            };
            client.once("ready", onReady);
            client.once("error", onError);
          });
        }
      }),
    );
    return true;
  } catch (err) {
    console.error("Redis not ready:", err.message);
    return false;
  }
}

async function close() {
  const clients = [redis, redisPub, redisSub].filter(Boolean);
  await Promise.allSettled(clients.map((client) => client.quit()));
}

module.exports = {
  redis,
  redisPub,
  redisSub,
  isRedisEnabled,
  whenReady,
  close,
};
