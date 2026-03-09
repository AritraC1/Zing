const jwt = require("jsonwebtoken");
const ENV = require("../../config/env");

const createAccessTokenForUser = (phone_number) => {
  const payload = {
    phone_number,
  };

  const token = jwt.sign(payload, ENV.JWT_SECRET_KEY);

  return token;
};

const validateToken = (token) => {
    const payload = jwt.verify(token, ENV.JWT_SECRET_KEY);
    return payload;
}

module.exports = {
    createAccessTokenForUser,
    validateToken
};
