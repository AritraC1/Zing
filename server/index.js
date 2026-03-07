const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

dotenv.config();

// Declarations
const app = express();
const PORT_NUMBER = process.env.PORT;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Start Server
app.listen(PORT_NUMBER, () => {
  console.log(`The server is running on localhost:${PORT_NUMBER}`);
  console.log("Swagger docs at http://localhost:3000/api-docs");
});
