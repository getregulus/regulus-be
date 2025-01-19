const jwt = require("jsonwebtoken");
const logger = require("@utils/logger");
const { AuthenticationError, AuthorizationError } = require("@utils/errors");

// Middleware to authenticate users
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      logger.error({
        message: "Authentication failed - no token",
        requestId: req.requestId,
        path: req.path,
      });
      throw new AuthenticationError("No token provided.");
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      logger.error({
        message: "Authentication failed - empty token",
        requestId: req.requestId,
        path: req.path,
      });
      throw new AuthenticationError("No token provided.");
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      logger.error({
        message: "Authentication failed - invalid token",
        requestId: req.requestId,
        path: req.path,
        error: error.message,
      });
      throw new AuthenticationError("Invalid token.");
    }
  } catch (error) {
    next(error);
  }
};

// Middleware to authorize specific roles
const authorize = (roles = []) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthenticationError("User not authenticated");
      }

      if (roles.length && !roles.includes(req.user.role)) {
        logger.error({
          message: "Authorization failed - insufficient permissions",
          requestId: req.requestId,
          userRole: req.user.role,
          requiredRoles: roles,
          path: req.path,
        });
        throw new AuthenticationError("Insufficient permissions");
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { authenticate, authorize };
