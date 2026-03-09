require("dotenv").config();
const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const allRoutes = require("./routes/allRoutes");
const ENV = require("./config/env");

// Declarations
const app = express();
const PORT_NUMBER = ENV.PORT;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
app.use("/api", allRoutes);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Start Server
app.listen(PORT_NUMBER, () => {
  console.log(`The server is running on localhost:${PORT_NUMBER}`);
  console.log(`Swagger docs at http://localhost:${PORT_NUMBER}/api-docs`);
});
