const fs = require("fs");
const path = require("path");

// Users
const users = fs.readFileSync(
  path.join(__dirname, "schemas/users.sql"),
  "utf8",
);

// conversations
const conversations = fs.readFileSync(
  path.join(__dirname, "schemas/conversations.sql"),
  "utf8",
);

// conversations participants
const conversation_participants = fs.readFileSync(
  path.join(__dirname, "schemas/conversation_participants.sql"),
  "utf8",
);

// media
const media = fs.readFileSync(
  path.join(__dirname, "schemas/media.sql"),
  "utf8",
);

// devices
const devices = fs.readFileSync(
  path.join(__dirname, "schemas/devices.sql"),
  "utf8",
);

// device_prekeys
const device_prekeys = fs.readFileSync(
  path.join(__dirname, "schemas/device_prekeys.sql"),
  "utf8",
);

// sessions
const sessions = fs.readFileSync(
  path.join(__dirname, "schemas/sessions.sql"),
  "utf8",
);

// foreign keys
const fk = fs.readFileSync(
  path.join(__dirname, "schemas/foreign_keys.sql"),
  "utf8",
);

module.exports = {
  users,
  conversations,
  conversation_participants,
  media,
  devices,
  device_prekeys,
  sessions,
  fk,
};
