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
      return res.status(401).json({
        message: "Unauthorized: Token missing",
      });
    }

    try {
      const userPayload = validateAccessToken(token);
      req.user = userPayload;
      return next();
    } catch (error) {
      console.log("Invalid token");
    }
  };
};

module.exports = checkForJwt;
