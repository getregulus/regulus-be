const jwt = require("jsonwebtoken");
const logger = require("@utils/logger");

// Middleware to authenticate users
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    logger.warn("Access denied. No token provided.");
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    logger.error(`Invalid token: ${error.message}`);
    res.status(400).json({ error: "Invalid token." });
  }
};

// Middleware to authorize specific roles
const authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      logger.warn(`Access forbidden for user role: ${req.user?.role}`);
      return res
        .status(403)
        .json({ error: "Access forbidden: insufficient privileges." });
    }
    next();
  };
};

module.exports = { authenticate, authorize };
