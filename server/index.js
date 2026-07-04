require("dotenv").config();
const ENV = require("./config/env");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const swaggerUI = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const allRoutes = require("./routes/allRoutes");
const errorHandler = require("./middlewares/error.middleware");

const corsOptions = {
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true,
};

// For Socket
const http = require("http");
const { Server } = require("socket.io");
const socketHandler = require("./shared/sockets/index");
const checkSocketForJwt = require("./middlewares/socketAuth.middleware");

// Declarations
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: corsOptions });
const PORT_NUMBER = ENV.PORT || 3000;

// Middlewares

// Applies the CORS middleware to all routes in your Express app.
// It tells the server how to handle requests coming from different origins (domains).
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
io.use(checkSocketForJwt("accessToken"));
app.use(cookieParser());

// Routes
app.use("/api", allRoutes);
app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerSpec));
app.use(errorHandler);

// Socket Setup
socketHandler(io);

// Start Server
server.listen(PORT_NUMBER, () => {
  console.log(`The server is running on localhost:${PORT_NUMBER}`);
  console.log(`Swagger docs at http://localhost:${PORT_NUMBER}/api-docs`);
});
