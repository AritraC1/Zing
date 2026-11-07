require("dotenv").config();

const ENV = require("./config/env");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const swaggerUI = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
import routes from "./routes/routes";
const errorHandler = require("./middlewares/error.middleware");
const dbPool = require("./config/db");

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
const socketHandler = require("./core/config/socket");
const checkSocketForJwt = require("./middlewares/socketAuth.middleware");

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

// Socket Setup
socketHandler(io);

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
