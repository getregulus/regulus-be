const xss = require("xss");
const { ValidationError } = require("./errors");
const logger = require("./logger");

class Sanitizer {
  static sanitizeObject(obj, options = {}) {
    const { allowedTags = [], stripTags = true, maxDepth = 3 } = options;

    try {
      return this._sanitizeRecursive(obj, allowedTags, stripTags, maxDepth, 0);
    } catch (error) {
      logger.error({
        message: "Error sanitizing object",
        error: error.message,
      });
      throw new ValidationError("Invalid input data structure");
    }
  }

  static _sanitizeRecursive(
    value,
    allowedTags,
    stripTags,
    maxDepth,
    currentDepth
  ) {
    if (currentDepth > maxDepth) {
      logger.warn({
        message: "Maximum object depth exceeded during sanitization",
        maxDepth,
        value: typeof value,
      });
      return null;
    }

    if (Array.isArray(value)) {
      return value.map((item) =>
        this._sanitizeRecursive(
          item,
          allowedTags,
          stripTags,
          maxDepth,
          currentDepth + 1
        )
      );
    }

    if (value && typeof value === "object") {
      const sanitized = {};
      for (const [key, val] of Object.entries(value)) {
        sanitized[key] = this._sanitizeRecursive(
          val,
          allowedTags,
          stripTags,
          maxDepth,
          currentDepth + 1
        );
      }
      return sanitized;
    }

    if (typeof value === "string") {
      return stripTags ? xss(value, { whiteList: allowedTags }) : value;
    }

    return value;
  }

  static sanitizeString(str, options = {}) {
    const {
      allowedTags = [],
      stripTags = true,
      trim = true,
      toLowerCase = false,
      removeExtraSpaces = true,
    } = options;

    try {
      if (typeof str !== "string") {
        return str;
      }

      let sanitized = stripTags ? xss(str, { whiteList: allowedTags }) : str;

      if (trim) {
        sanitized = sanitized.trim();
      }

      if (toLowerCase) {
        sanitized = sanitized.toLowerCase();
      }

      if (removeExtraSpaces) {
        sanitized = sanitized.replace(/\s+/g, " ");
      }

      return sanitized;
    } catch (error) {
      logger.error({
        message: "Error sanitizing string",
        error: error.message,
        string: str,
      });
      throw new ValidationError("Invalid input string");
    }
  }

  static sanitizeEmail(email) {
    if (typeof email !== "string") {
      return email;
    }

    return this.sanitizeString(email, {
      stripTags: true,
      trim: true,
      toLowerCase: true,
      removeExtraSpaces: true,
    });
  }

  static sanitizeHtml(html, options = {}) {
    const defaultAllowedTags = ["b", "i", "em", "strong", "a", "p", "br"];

    const {
      allowedTags = defaultAllowedTags,
      allowedAttributes = {
        a: ["href", "title", "target"],
      },
    } = options;

    try {
      return xss(html, {
        whiteList: allowedTags.reduce((acc, tag) => {
          acc[tag] = allowedAttributes[tag] || [];
          return acc;
        }, {}),
      });
    } catch (error) {
      logger.error({
        message: "Error sanitizing HTML",
        error: error.message,
        html: html,
      });
      throw new ValidationError("Invalid HTML input");
    }
  }
}

module.exports = Sanitizer;
