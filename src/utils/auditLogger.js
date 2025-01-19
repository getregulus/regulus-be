const prisma = require("./prisma");
const logger = require("./logger");

const logAudit = async (
  userId,
  action,
  organizationId,
  targetId,
  targetType
) => {
  try {
    logger.info({
      message: "Creating audit log",
      userId,
      action,
      organizationId,
      targetId,
      targetType,
    });

    const auditLog = await prisma.auditLog.create({
      data: {
        user_id: userId,
        action,
        organizationId,
        target_id: targetId,
        target_type: targetType,
        timestamp: new Date(),
      },
    });

    logger.info({
      message: "Audit log created successfully",
      auditLogId: auditLog.id,
    });

    return auditLog;
  } catch (error) {
    logger.error({
      message: "Failed to create audit log",
      error: error.message,
      userId,
      action,
      organizationId,
      targetId,
      targetType,
    });
    // Don't throw error - audit logging should not break main functionality
    return null;
  }
};

module.exports = { logAudit };
