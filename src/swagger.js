const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Regulus.ai API Documentation",
      version: "1.0.0",
      description: "API documentation for Regulus.ai",
      contact: {
        name: "API Support",
        email: "support@example.com",
      },
    },
    servers: [
      {
        url: process.env.API_URL || "http://localhost:3000",
        description: "API Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: "Auth",
        description: "Authentication and user management endpoints",
      },
      {
        name: "Organizations",
        description: "Organization management endpoints",
      },
      {
        name: "Transactions",
        description: "Transaction monitoring endpoints",
      },
      {
        name: "Rules",
        description: "Rule management endpoints",
      },
      {
        name: "Alerts",
        description: "Alert management endpoints",
      },
      {
        name: "Watchlist",
        description: "Watchlist management endpoints",
      },
    ],
  },
  apis: ["./src/routes/*.js", "./src/swagger/schemas.js"],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
