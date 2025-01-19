const pino = require("pino");
const pretty = require("pino-pretty");

const streams = [
  // Console output with pretty printing
  {
    stream: pretty({
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
    }),
  },
  // File output
  {
    stream: pino.destination({
      dest: "./logs/app.log",
      sync: false, // Asynchronous logging
    }),
  },
];

const logger = pino(
  {
    level: process.env.LOG_LEVEL || "info",
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  pino.multistream(streams)
);

module.exports = logger;
