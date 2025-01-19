const logger = require("@utils/logger");
const { createResponse } = require("@utils/responseHandler");
const {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
} = require("@utils/errors");

const errorHandler = (err, req, res, next) => {
  // Log error with context
  logger.error({
    message: "Error occurred",
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
    },
    request: {
      id: req.requestId,
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.method !== "GET" ? req.body : undefined,
    },
    user: req.user
      ? {
          id: req.user.id,
          email: req.user.email,
        }
      : undefined,
  });

  // Handle Prisma errors
  if (err.code === "P2002") {
    err = new ConflictError("Resource already exists");
  } else if (err.code === "P2025") {
    err = new NotFoundError("Resource not found");
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError") {
    err = new AuthenticationError("Invalid token");
  }

  // Handle validation errors
  if (err.name === "ValidationError") {
    err = new ValidationError(err.message);
  }

  // Determine if error is known application error
  const isOperationalError = err instanceof AppError;

  // Send response
  res
    .status(err.status || 500)
    .json(
      createResponse(
        false,
        null,
        isOperationalError || process.env.NODE_ENV === "development"
          ? err.message
          : "Internal server error"
      )
    );
};

module.exports = errorHandler;
