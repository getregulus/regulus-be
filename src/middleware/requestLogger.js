const logger = require("@utils/logger");

const requestLogger = (req, res, next) => {
  const { method, url, body } = req;
  logger.info({
    message: "Incoming Request",
    method,
    url,
    body: Object.keys(body).length > 0 ? body : "No body",
  });
  next();
};

module.exports = requestLogger;
