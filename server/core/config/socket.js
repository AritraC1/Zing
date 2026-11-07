const chatSocket = require("../../modules/chat/chat.socket");

module.exports = (io) => {
  chatSocket(io);
};
