const cookie = require("cookie");
const { validateAccessToken } = require("../shared/utils/jwtTokenUtil");

const checkSocketForJwt = (cookieName = "token") => {
  return (socket, next) => {
    let token = null;

    // Check auth field
    if (socket.handshake.auth?.token) {
      token = socket.handshake.auth.token;
    }

    // check authorisation header
    if (!token) {
      const authHeader = socket.handshake.headers?.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    // Check cookies
    if (!token && socket.handshake.headers?.cookie) {
      const cookies = cookie.parse(socket.handshake.headers.cookie);
      token = cookies[cookieName];
    }

    // IF there is no toke, reject connection
    if (!token) {
      return next(new Error("Authentication error: Token missing"));
    }

    try {
      const userPayload = validateAccessToken(token);
      socket.user = userPayload;
    } catch (error) {
      console.log("Invalid token");

      return next(new Error("Authentication error: Invalid token"));
    }

    return next();
  };
};

module.exports = checkSocketForJwt;
