const chatSocket = require("../../modules/chat/chat.socket");
const callSocket = require("../../modules/calls/call.socket");
const groupCallSocket = require("../../modules/calls/groupCall.socket");

module.exports = (io) => {
  chatSocket(io);
  callSocket(io);
  groupCallSocket(io);
};
