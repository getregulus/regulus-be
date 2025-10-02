const express = require("express");
const cors = require("cors");
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const errorHandler = require("@middleware/errorHandler");
const requestLogger = require("@middleware/requestLogger");
const requestId = require("@middleware/requestId");

// Import routes
const authRoutes = require("@routes/auth");
const organizationRoutes = require("@routes/organizations");
const transactionRoutes = require("@routes/transactions");
const ruleRoutes = require("@routes/rules");
const alertRoutes = require("@routes/alerts");
const watchlistRoutes = require("@routes/watchlist");
const auditRoutes = require("@routes/audit");
const channelRoutes = require("@routes/channels");

const app = express();
// Middleware
app.use(express.json());
app.use(cors());
app.use(requestId);
app.use(requestLogger);


// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.includes(",")
        ? process.env.CORS_ORIGIN.split(",")
        : process.env.CORS_ORIGIN
      : "*",
    methods: ["GET", "POST", "PUT", "DELETE"], // Allowed HTTP methods
    allowedHeaders: ["Content-Type", "Authorization"], // Allowed headers
  })
);


// API Routes
app.use("/auth", authRoutes);
app.use("/organizations", organizationRoutes);
app.use("/transactions", transactionRoutes);
app.use("/rules", ruleRoutes);
app.use("/alerts", alertRoutes);
app.use("/watchlist", watchlistRoutes);
app.use("/audit", auditRoutes);
app.use("/channels", channelRoutes);

// Swagger documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Error handling
app.use(errorHandler);

module.exports = app;
