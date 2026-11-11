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
let connected = false; // true only after a confirmed "ready" event

// Log each failure category once — a permanently unreachable Redis
// must not spam the console on every reconnect attempt or request.
const loggedOnce = new Set();
function logOnce(key, message) {
  if (loggedOnce.has(key)) return;
  loggedOnce.add(key);
  console.error(message);
}

function createClient() {
  // Lazy require so jest environments without the dependency installed
  // still load modules that reference this file.
  const Redis = require("ioredis");

  const client = new Redis(ENV.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 2,
    retryStrategy(times) {
      // Back off, then give up after ~30 consecutive failures
      // (~2.5 minutes). A Redis that never appears must not retry
      // forever; in-process fallbacks take over and, in Docker
      // deployments, a container restart re-arms the connection.
      if (times > 30) {
        logOnce(
          "retries-exhausted",
          "Redis unreachable after 30 attempts — continuing with in-process behavior",
        );
        return null;
      }
      return Math.min(times * 500, 5000);
    },
  });

  client.on("ready", () => {
    connected = true;
  });

  client.on("end", () => {
    connected = false;
  });

  client.on("error", (err) => {
    logOnce(
      "connection-error",
      `Redis error (continuing with degraded behavior): ${err.message}`,
    );
  });

  return client;
}

if (ENV.REDIS_URL) {
  try {
    redis = createClient();
    redisPub = createClient();
    redisSub = createClient();

    const connectSafely = (client, label) => {
      client.connect().catch((err) => {
        logOnce(`connect-${label}`, `Redis ${label} connect failed: ${err.message}`);
      });
    };
    connectSafely(redis, "client");
    connectSafely(redisPub, "pub");
    connectSafely(redisSub, "sub");
  } catch (err) {
    console.error("Failed to initialize Redis clients:", err.message);
    redis = null;
    redisPub = null;
    redisSub = null;
  }
}

// True only once the shared client has actually completed a
// connection ("ready"). A configured-but-unreachable Redis reports
// false here so consumers (rate limiter, presence) stay on their
// in-process fallbacks instead of throwing per request.
const isRedisEnabled = () => Boolean(redis && connected);

// Awaitable readiness check: resolves true once the shared client is
// connected, false when Redis is disabled, failed to come up, or is
// not ready within `timeoutMs`. connect() throws if a client is
// already connecting/connected, so only connect clients that are
// still idle ("wait"); individual connect failures are swallowed and
// logged once.
async function whenReady(timeoutMs = 3000) {
  if (!ENV.REDIS_URL || !redis) return false;
  try {
    const clients = [redis, redisPub, redisSub];
    await Promise.all(
      clients
        .filter((client) => client.status === "wait")
        .map((client) => client.connect().catch(() => {})),
    );

    const waitForReady = (client) =>
      client.status === "ready"
        ? Promise.resolve()
        : new Promise((resolve, reject) => {
            const onReady = () => {
              cleanup();
              resolve();
            };
            const onError = (err) => {
              cleanup();
              reject(err);
            };
            const cleanup = () => {
              client.off("ready", onReady);
              client.off("error", onError);
            };
            client.once("ready", onReady);
            client.once("error", onError);
          });

    const allReady = Promise.all(clients.map(waitForReady)).then(() => true);
    const timedOut = new Promise((resolve) => setTimeout(() => resolve(false), timeoutMs));
    return await Promise.race([allReady, timedOut]).then((ready) => ready && isRedisEnabled());
  } catch (err) {
    logOnce("not-ready", `Redis not ready: ${err.message}`);
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
