const db = require("@models/db");
const logger = require("@utils/logger");

const logAudit = async (userId, action, targetId = null, targetType = null) => {
  try {
    await db.query(
      `INSERT INTO audit_logs (user_id, action, target_id, target_type) VALUES ($1, $2, $3, $4)`,
      [userId, action, targetId, targetType]
    );
    logger.info(`Audit log: User ${userId} performed action: ${action}`);
  } catch (error) {
    logger.error(`Error logging audit action: ${error.message}`);
  }
};

module.exports = { logAudit };
