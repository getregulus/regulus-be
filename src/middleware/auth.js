const jwt = require("jsonwebtoken");
const logger = require("@utils/logger");
const { AuthenticationError } = require("@utils/errors");

// Middleware to authenticate users
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];

  try {
    if (apiKey) {
      // API Key authentication
      const decoded = jwt.verify(apiKey, process.env.API_KEY_SECRET);
      const apiKeyRecord = await prisma.apiKey.findFirst({
        where: {
          key: apiKey, // Hash and compare if stored hashed
          status: "active",
          organizationId: decoded.organizationId,
        },
      });

      if (!apiKeyRecord || new Date(decoded.expiresAt) < new Date()) {
        throw new AuthenticationError("Invalid or expired API key.");
      }

      req.organizationId = decoded.organizationId;
      req.userId = decoded.createdBy; // Optional, for audit purposes
      return next();
    }

    if (authHeader && authHeader.startsWith("Bearer ")) {
      // JWT authentication
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = decoded;
      return next();
    }

    throw new AuthenticationError("No token or API key provided.");
  } catch (error) {
    logger.error({
      message: "Authentication failed",
      error: error.message,
      path: req.path,
      requestId: req.requestId,
    });
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
