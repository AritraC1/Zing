const { validateAccessToken } = require("../shared/utils/jwtTokenUtil");

const checkForJwt = (cookieName = "token") => {
  return (req, res, next) => {
    let token = null;

    // Check Authorization header (Mobile)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    // If no header token, check cookies (Web)
    if (!token && req.cookies) {
      token = req.cookies[cookieName];
    }

    if (!token) {
      return next();
    }

    try {
      const userPayload = validateAccessToken(token);
      req.user = userPayload;
    } catch (error) {
      console.log("Invalid token");
    }

    return next();
  };
};

module.exports = checkForJwt;
