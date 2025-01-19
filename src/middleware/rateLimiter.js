const rateLimit = require("express-rate-limit");
const logger = require("@utils/logger");

// Helper function to check if rate limiting should be enabled
const shouldEnableRateLimit = () => {
  return process.env.NODE_ENV === "production";
};

// Bypass middleware for development
const bypassMiddleware = (req, res, next) => next();

// Configure auth route limiter
const authLimiter = shouldEnableRateLimit()
  ? rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // limit each IP to 5 requests per windowMs
      handler: (req, res) => {
        logger.warn({
          message: "Rate limit exceeded",
          ip: req.ip,
          path: req.path,
          requestId: req.requestId,
        });
        res.status(429).json({
          success: false,
          error: "Too many requests, please try again later.",
        });
      },
    })
  : bypassMiddleware;

// Configure API route limiter
const apiLimiter = shouldEnableRateLimit()
  ? rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      handler: (req, res) => {
        logger.warn({
          message: "Rate limit exceeded",
          ip: req.ip,
          path: req.path,
          requestId: req.requestId,
        });
        res.status(429).json({
          success: false,
          error: "Too many requests, please try again later.",
        });
      },
    })
  : bypassMiddleware;

module.exports = {
  authLimiter,
  apiLimiter,
};
