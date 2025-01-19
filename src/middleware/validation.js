const { ValidationError } = require("@utils/errors");
const { defaultOptions } = require("@utils/validators");
const Sanitizer = require("@utils/sanitizer");
const logger = require("@utils/logger");

const validateSchema = (schema, options = {}) => {
  const {
    sanitize = true,
    sanitizeOptions = {},
    property = "body",
    ...validationOptions
  } = options;

  return (req, res, next) => {
    try {
      // Sanitize input if enabled
      if (sanitize) {
        req[property] = Sanitizer.sanitizeObject(
          req[property],
          sanitizeOptions
        );
      }

      // Validate against schema
      const { error, value } = schema.validate(req[property], {
        ...defaultOptions,
        ...validationOptions,
      });

      if (error) {
        const errors = error.details.map((detail) => detail.message);
        logger.warn({
          message: "Validation failed",
          errors,
          path: req.path,
          requestId: req.requestId,
          input: req[property],
        });
        throw new ValidationError(errors.join(", "));
      }

      // Replace request data with validated and sanitized data
      req[property] = value;
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { validateSchema };
