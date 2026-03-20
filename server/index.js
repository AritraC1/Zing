require("dotenv").config();
const ENV = require("./config/env");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const allRoutes = require("./routes/allRoutes");

// For Socket
const http = require("http");
const { Server } = require("socket.io");
const socketHandler = require("./shared/sockets/index");
const checkSocketForJwt = require("./middlewares/socketAuth.middleware");

// Declarations
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:5173", credentials: true },
}); // Instance of io (input output)
const PORT_NUMBER = ENV.PORT;

// Middlewares

// Applies the CORS middleware to all routes in your Express app.
// It tells the server how to handle requests coming from different origins (domains).
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"], // Specifies which HTTP methods are allowed in cross-origin requests.
    credentials: true, // Allows sending cookies, authorization headers, or TLS client certificates.
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
io.use(checkSocketForJwt());
app.use(cookieParser());

// Routes
app.use("/api", allRoutes);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Socket Setup
socketHandler(io);

// Start Server
server.listen(PORT_NUMBER, () => {
  console.log(`The server is running on localhost:${PORT_NUMBER}`);
  console.log(`Swagger docs at http://localhost:${PORT_NUMBER}/api-docs`);
});
