require("dotenv").config();
const ENV = require("./config/env");
const express = require("express");
const cors = require("cors");
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
  cors: { origin: "*", credentials: true },
}); // Instance of io (input output)
const PORT_NUMBER = ENV.PORT;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
io.use(checkSocketForJwt());

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
