const chatSocket = require("../../modules/chat/chat.socket");
const callSocket = require("../../modules/calls/call.socket");

module.exports = (io) => {
  chatSocket(io);
  callSocket(io);
};
