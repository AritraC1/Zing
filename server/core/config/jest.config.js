module.exports = {
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.js", "**/*.test.js"],
  collectCoverageFrom: [
    "modules/**/*.js",
    "shared/**/*.js",
    "middlewares/**/*.js",
    "!**/node_modules/**",
  ],
  coverageDirectory: "coverage",
  verbose: true,
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testTimeout: 10000,
  transformIgnorePatterns: [
    "/node_modules/(?!uuid/)",
  ],
  moduleNameMapper: {
    "^uuid$": "<rootDir>/__mocks__/uuid.js",
    "^../config/firebase$": "<rootDir>/__mocks__/firebase.js",
    "^../../config/firebase$": "<rootDir>/__mocks__/firebase.js",
  },
};