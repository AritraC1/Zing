// Thin registry around the Socket.IO server instance so code outside
// the socket module (e.g. REST controllers) can fan out chat events.
// This lets clients send messages over HTTP when their socket is down
// and still get same behavior as the socket path.

let ioInstance = null;

module.exports = {
  setIo(io) {
    ioInstance = io;
  },

  notifyNewMessage(message, recipientIds) {
    if (!ioInstance || !message) return;
    (recipientIds || []).forEach((recipientId) => {
      ioInstance.to(`user:${recipientId}`).emit("new_message", message);
    });
  },
};
