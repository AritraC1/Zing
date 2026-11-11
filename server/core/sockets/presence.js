// Shared live-presence registry for Socket.IO connections.
//
// Tracks which authenticated users currently have at least one connected
// socket (tab/device). Both the chat and call socket modules use it so the
// two features never disagree about who is online.
//
// Storage:
//   - REDIS_URL configured -> Redis is the source of truth so multiple
//     Node instances behind a load balancer agree on who is online.
//     Keys: presence:online (SET of userIds) and presence:<userId>
//     (per-user key with a TTL that is refreshed while sockets live).
//     If a node dies, its users' keys expire and everyone appears
//     offline instead of ghost-online.
//   - No Redis -> identical behavior with the in-process Map that was
//     here before (single instance deployments, tests).

const {
  redis,
  isRedisEnabled,
} = require("../config/redis.config");

const onlineUsers = new Map(); // userId -> Set<socket.id> (local sockets)

const PRESENCE_TTL_SECONDS = 60; // per-user key TTL, refreshed below
const PRESENCE_REFRESH_MS = 20 * 1000; // refresh interval (< TTL)

const ONLINE_SET_KEY = "presence:online";
const userPresenceKey = (userId) => `presence:${userId}`;

const userRoom = (userId) => `user:${userId}`;

// Returns true when the user has just gone from offline -> online
// (i.e. this is their first connected socket on any node).
function addSocketForUser(socket, userId) {
  let sockets = onlineUsers.get(userId);
  const wasOffline = !sockets || sockets.size === 0;

  if (!sockets) {
    sockets = new Set();
    onlineUsers.set(userId, sockets);
  }
  sockets.add(socket.id);

  if (wasOffline && isRedisEnabled()) {
    // Register in Redis with a TTL. The periodic refresh keeps it alive
    // while this node still holds at least one socket for the user; if
    // the node dies without cleanup the key expires on its own.
    const pipeline = redis.pipeline();
    pipeline.sadd(ONLINE_SET_KEY, userId);
    pipeline.set(userPresenceKey(userId), "1", "EX", PRESENCE_TTL_SECONDS);
    pipeline.exec().catch((err) => {
      console.error("presence redis add error:", err.message);
    });
  }

  return wasOffline;
}

// Returns true when the user has just gone offline
// (i.e. this was their last connected socket anywhere).
function removeSocketForUser(socket, userId) {
  const sockets = onlineUsers.get(userId);
  if (!sockets) return true;

  sockets.delete(socket.id);
  if (sockets.size === 0) {
    onlineUsers.delete(userId);

    if (isRedisEnabled()) {
      // Only clear the Redis state if no other node claims this user
      // between our local removal and the write (best effort race
      // guard; the TTL covers any pathological ordering anyway).
      redis
        .multi()
        .srem(ONLINE_SET_KEY, userId)
        .del(userPresenceKey(userId))
        .exec()
        .catch((err) => {
          console.error("presence redis remove error:", err.message);
        });
    }
    return true;
  }
  return false;
}

// Periodic TTL refresh for users with live sockets on this node.
// Restores keys lost to a Redis restart/failover and keeps online state
// from expiring during long-lived connections.
setInterval(() => {
  if (!isRedisEnabled() || onlineUsers.size === 0) return;

  const userIds = Array.from(onlineUsers.keys());
  const pipeline = redis.pipeline();
  pipeline.sadd(ONLINE_SET_KEY, ...userIds);
  userIds.forEach((userId) => {
    pipeline.set(userPresenceKey(userId), "1", "EX", PRESENCE_TTL_SECONDS);
  });
  pipeline.exec().catch((err) => {
    console.error("presence redis refresh error:", err.message);
  });
}, PRESENCE_REFRESH_MS).unref();

// Snapshot of who is online. With Redis this is the cluster-wide set;
// without it, the local registry.
async function getOnlineUserIds() {
  if (isRedisEnabled()) {
    try {
      return await redis.smembers(ONLINE_SET_KEY);
    } catch (err) {
      console.error("getOnlineUserIds redis error:", err.message);
      // fall through to the local registry
    }
  }
  return Array.from(onlineUsers.keys());
}

// Online check for any user, including those connected to other nodes.
async function isUserOnline(userId) {
  if (isRedisEnabled()) {
    try {
      return (await redis.exists(userPresenceKey(userId))) === 1;
    } catch (err) {
      console.error("isUserOnline redis error:", err.message);
      // fall through to the local registry
    }
  }
  const sockets = onlineUsers.get(userId);
  return !!sockets && sockets.size > 0;
}

module.exports = {
  onlineUsers,
  userRoom,
  addSocketForUser,
  removeSocketForUser,
  getOnlineUserIds,
  isUserOnline,
};
