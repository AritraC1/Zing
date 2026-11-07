const swaggerDoc = require("swagger-jsdoc");

const options = {
    definition: {
    openapi: "3.0.0",
    info: {
      title: "Zing API Documentation",
      version: "1.0.0",
      description: "Chat Application API",
    },
  },
  apis: ["./docs/*.js"],
};

const swaggerSpec = swaggerDoc(options);

module.exports = swaggerSpec;