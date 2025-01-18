const { PrismaClient } = require('@prisma/client');
const logger = require("@utils/logger");

const prisma = new PrismaClient();

const logAudit = async (userId, action, organizationId, targetId = null, targetType = null) => {
  try {
    await prisma.auditLog.create({
      data: {
        user_id: userId,
        action,
        target_id: targetId,
        target_type: targetType,
        organizationId
      }
    });
    
    logger.info(`Audit log: User ${userId} performed action: ${action} in organization ${organizationId}`);
  } catch (error) {
    logger.error(`Error logging audit action: ${error.message}`);
  }
};

module.exports = { logAudit };
