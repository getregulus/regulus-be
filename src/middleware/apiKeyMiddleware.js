const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const prisma = require("@utils/prisma");
const logger = require("@utils/logger");
const { AuthenticationError } = require("@utils/errors");

const apiKeyMiddleware = async (req, res, next) => {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey) {
    return next(new AuthenticationError("API key missing."));
  }

  try {
    const decoded = jwt.verify(apiKey, process.env.API_KEY_SECRET);
    console.log("Decoded Token:", decoded);

    const apiKeyRecord = await prisma.apiKey.findFirst({
      where: {
        organizationId: decoded.organizationId,
        status: "active",
      },
    });

    if (!apiKeyRecord) {
      throw new AuthenticationError("API key not found or revoked.");
    }

    const isValid = await bcrypt.compare(apiKey, apiKeyRecord.key);
    if (!isValid || new Date(decoded.expiresAt) < new Date()) {
      throw new AuthenticationError("Invalid or expired API key.");
    }

    // Populate req.user for compatibility with other middlewares
    req.user = {
      id: decoded.createdBy,
      role: "apiKeyUser", // Assign a generic role
    };

    req.organizationId = decoded.organizationId;
    next();
  } catch (error) {
    logger.error({
      message: "API key validation failed",
      error: error.message,
      path: req.path,
      requestId: req.requestId,
    });
    next(error);
  }
};

module.exports = apiKeyMiddleware;
