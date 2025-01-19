const logger = require("@utils/logger");

const requestLogger = (req, res, next) => {
  // Start timer
  const start = process.hrtime();

  // Log request
  logger.info({
    message: "Incoming request",
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    query: req.query,
    body: req.method !== "GET" ? req.body : undefined,
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });

  // Log response when finished
  res.on("finish", () => {
    // Calculate processing time
    const diff = process.hrtime(start);
    const time = diff[0] * 1e3 + diff[1] * 1e-6; // Convert to milliseconds

    const logLevel =
      res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";

    logger[logLevel]({
      message: "Request completed",
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      processingTime: `${time.toFixed(2)}ms`,
      contentLength: res.get("content-length"),
      userAgent: req.get("user-agent"),
    });
  });

  next();
};

module.exports = requestLogger;
