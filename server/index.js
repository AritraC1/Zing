require("dotenv").config();

const ENV = require("./core/config/env");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const swaggerUI = require("swagger-ui-express");
const swaggerSpec = require("./core/config/swagger.config");
const routes = require("./routes/routes");
const errorHandler = require("./core/errors/error.middleware");
const dbPool = require("./core/config/db.config");

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost",
  "http://127.0.0.1",
].filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true,
};

// For Socket
const http = require("http");
const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");
const socketHandler = require("./core/config/socket");
const checkSocketForJwt = require("./modules/auth/socketAuth.middleware");
const redisConfig = require("./core/config/redis.config");

// Declarations
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: corsOptions });
const PORT_NUMBER = ENV.PORT || 3000;

// Trust proxy for correct IP detection behind nginx/load balancers (needed for rate limiter)
app.set("trust proxy", 1);

// Handle pg pool errors to prevent unhandled rejections crashing the process
dbPool.on("error", (err) => {
  console.error("Unexpected pg pool error:", err);
});

// Middlewares
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
io.use(checkSocketForJwt("accessToken"));
app.use(cookieParser());

// Health check endpoint (for load balancers, Docker, k8s)
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api", routes);
app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerSpec));
app.use(errorHandler);

// Socket Setup. Handlers attach immediately so no early connection is
// missed. When Redis is configured, the Redis adapter is swapped in
// once connected so room fan-out (user:<id>) and io.emit reach sockets
// on every Node instance — required once multiple api containers run
// behind a load balancer. Failure to connect keeps the default
// in-memory adapter.
socketHandler(io);

(async () => {
  const ready = await redisConfig.whenReady();
  if (ready) {
    io.adapter(createAdapter(redisConfig.redisPub, redisConfig.redisSub));
    console.log("Socket.IO Redis adapter enabled");
  } else if (process.env.REDIS_URL) {
    console.warn("Redis unavailable — running with in-memory adapter");
  }
})();

// Graceful shutdown
let isShuttingDown = false;
async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`${signal} received, shutting down gracefully...`);

  // Stop accepting new connections
  server.close(async () => {
    console.log("HTTP server closed");
    try {
      // Close socket.io
      await new Promise((resolve) => io.close(resolve));
      console.log("Socket.IO closed");
      // Close redis clients (no-op when Redis is disabled)
      await redisConfig.close();
      // Close pg pool
      await dbPool.end();
      console.log("Database pool closed");
      process.exit(0);
    } catch (err) {
      console.error("Error during shutdown:", err);
      process.exit(1);
    }
  });

  // Force close after 10s
  setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Start Server
server.listen(PORT_NUMBER, () => {
  console.log(`The server is running on localhost:${PORT_NUMBER}`);
  console.log(`Swagger docs at http://localhost:${PORT_NUMBER}/api-docs`);
  console.log(`Health check at http://localhost:${PORT_NUMBER}/health`);
});
