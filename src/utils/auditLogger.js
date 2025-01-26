const prisma = require("./prisma");
const logger = require("./logger");

/**
 * Logs an action to the audit log
 * @param {Object} req - The request object
 * @param {Object} options - Details of the action
 * @param {string} options.action - Description of the action performed
 */
const logAudit = async (req, { action }) => {
  const { user, organization } = req;

  if (!user || !organization) {
    logger.error({
      message: "Audit logging failed: Missing user or organization context",
    });
    return null;
  }

  try {
    logger.info({
      message: "Creating audit log",
      userId: user.id,
      action,
      organizationId: organization.id,
    });

    const auditLog = await prisma.auditLog.create({
      data: {
        organizationId: organization.id,
        action,
        userId: user.id,
        createdAt: new Date(),
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
      userId: user.id,
      action,
      organizationId: organization.id,
    });
    // Don't throw error - audit logging should not break main functionality
    return null;
  }
};

module.exports = { logAudit };
