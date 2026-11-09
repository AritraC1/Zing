// Shared live-presence registry for Socket.IO connections.
//
// Tracks which authenticated users currently have at least one connected
// socket (tab/device). Both the chat and call socket modules use it so the
// two features never disagree about who is online.

const onlineUsers = new Map(); // userId -> Set<socket.id>

const userRoom = (userId) => `user:${userId}`;

// Returns true when the user has just gone from offline -> online
// (i.e. this is their first connected socket).
function addSocketForUser(socket, userId) {
  let sockets = onlineUsers.get(userId);
  const wasOffline = !sockets || sockets.size === 0;

  if (!sockets) {
    sockets = new Set();
    onlineUsers.set(userId, sockets);
  }
  sockets.add(socket.id);

  return wasOffline;
}

// Returns true when the user has just gone offline
// (i.e. this was their last connected socket).
function removeSocketForUser(socket, userId) {
  const sockets = onlineUsers.get(userId);
  if (!sockets) return true;

  sockets.delete(socket.id);
  if (sockets.size === 0) {
    onlineUsers.delete(userId);
    return true;
  }
  return false;
}

function getOnlineUserIds() {
  return Array.from(onlineUsers.keys());
}

function isUserOnline(userId) {
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
