const { v4: uuidv4, validate: uuidValidate } = require("uuid");

// uuid v13+ is ESM only, so we provide a CommonJS-compatible mock
const mockUuid = {
  v4: uuidv4 || (() => "mock-uuid-" + Math.random().toString(36).slice(2)),
  validate: uuidValidate || ((str) => typeof str === "string" && str.length === 36),
};

module.exports = mockUuid;
module.exports.v4 = mockUuid.v4;
module.exports.validate = mockUuid.validate;
module.exports.default = mockUuid;