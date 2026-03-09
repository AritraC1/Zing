const Redis = require("ioredis");
const ENV = require("./env");

// Creating a Redis instance
const redis = new Redis(ENV.REDIS);

redis.on("connect", () => {
  console.log("Redis connected");
});

redis.on("error", (err) => {
  console.error("Redis error:", err);
});

module.exports = redis;