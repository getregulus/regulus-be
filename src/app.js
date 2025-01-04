const express = require("express");
const cors = require("cors");
const app = express();
const requestLogger = require("./middleware/requestLogger");

// Middleware
app.use(express.json());
app.use(cors());
app.use(requestLogger);

app.use(
  cors({
    origin: "http://localhost:3000", // Allow requests only from this origin
    methods: ["GET", "POST", "PUT", "DELETE"], // Allowed HTTP methods
    allowedHeaders: ["Content-Type", "Authorization"], // Allowed headers
  })
);

// Route Imports
const transactionRoutes = require("./routes/transactions");
const alertRoutes = require("./routes/alerts");
const ruleRoutes = require("./routes/rules");
const watchlistRoutes = require("./routes/watchlist");
const authRoutes = require("@routes/auth");

// Routes
app.use("/transactions", transactionRoutes);
app.use("/alerts", alertRoutes);
app.use("/rules", ruleRoutes);
app.use("/watchlist", watchlistRoutes);
app.use("/auth", authRoutes);

// Default Route
app.get("/", (req, res) => {
  res.send({ message: "Hello from Regulus MVP!!" });
});

// Swagger middleware
const { swaggerUi, swaggerDocs } = require("./swagger");
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unexpected error:", err.message);
  res.status(500).json({ success: false, error: "Internal Server Error" });
});

module.exports = app;
