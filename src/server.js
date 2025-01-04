require("dotenv").config();
require("module-alias/register");

const app = require("./app");
const logger = require("@utils/logger");
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`Regulus MVP listening on port ${PORT}`);
});
