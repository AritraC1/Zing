const jwt = require("jsonwebtoken");
const ENV = require("../../config/env");

// Generate Access Token
const createAccessTokenForUser = ({ id, phoneNumber }) => {
  const payload = {
    id,
    phoneNumber,
  };

  const token = jwt.sign(payload, ENV.JWT_SECRET_KEY, {
    expiresIn: "15m",
  });

  return token;
};

// Generate Refresh Token
const createRefreshTokenForUser = ({ id, phoneNumber }) => {
  const payload = {
    id,
    phoneNumber,
  };

  const token = jwt.sign(payload, ENV.JWT_REFRESH_SECRET_KEY, {
    expiresIn: "14d",
  });

  return token;
};

// Validate Access Token
const validateAccessToken = (token) => {
  return jwt.verify(token, ENV.JWT_SECRET_KEY);
};

// Validate Refresh Token
const validateRefreshToken = (token) => {
  return jwt.verify(token, ENV.JWT_REFRESH_SECRET_KEY);
};

module.exports = {
  createAccessTokenForUser,
  createRefreshTokenForUser,
  validateAccessToken,
  validateRefreshToken,
};
