const ENV = require("../../config/env");

function buildMediaUrl(storageKey) {
  if (!storageKey) return null;
  return `https://res.cloudinary.com/${ENV.CLOUDINARY_CLOUD_NAME}/image/upload/${storageKey}`;
}

module.exports = { buildMediaUrl };
