const Joi = require("joi");

// Common validation patterns
const patterns = {
  password:
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  phone: /^\+?[\d\s-]{8,}$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
};

// Common validation schemas
const commonSchemas = {
  id: Joi.number().integer().positive(),
  email: Joi.string().email(),
  name: Joi.string().min(2).max(100),
  date: Joi.date().iso(),
  boolean: Joi.boolean(),
  uuid: Joi.string().pattern(patterns.uuid),
  password: Joi.string()
    .pattern(patterns.password)
    .message(
      "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character"
    ),
  phone: Joi.string()
    .pattern(patterns.phone)
    .message("Invalid phone number format"),
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string(),
    sortOrder: Joi.string().valid("asc", "desc").default("desc"),
  }),
};

// Common validation options
const defaultOptions = {
  abortEarly: false,
  stripUnknown: true,
  errors: {
    wrap: {
      label: "",
    },
  },
};

module.exports = {
  patterns,
  commonSchemas,
  defaultOptions,
};
