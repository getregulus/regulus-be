const pino = require("pino");

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport:
    process.env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "yyyy-mm-dd HH:MM:ss",
          },
        }
      : undefined,
});

module.exports = logger;
