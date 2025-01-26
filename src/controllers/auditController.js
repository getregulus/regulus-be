const prisma = require("@utils/prisma");
const logger = require("@utils/logger");
const { createResponse } = require("@utils/responseHandler");

/**
 * Create a new audit log entry
 * @param {Object} req - The request object
 * @returns {Object} The created audit log
 */
async function createAuditLog(req) {
  const { action, userId } = req.body;
  const { organization } = req;

  if (!organization || !organization.id) {
    const error = new Error("Organization context is missing or invalid.");
    error.status = 400; // Bad Request
    throw error;
  }

  const organizationId = organization.id;

  try {
    logger.info({
      message: "Creating audit log",
      organizationId,
      action,
      userId,
    });

    // Validate if the user exists and is part of the organization
    const member = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId,
      },
    });

    if (!member) {
      const error = new Error("User not found in the organization.");
      error.status = 400; // Bad Request
      throw error;
    }

    // Create the audit log
    const auditLog = await prisma.auditLog.create({
      data: {
        organizationId,
        action,
        userId,
        createdAt: new Date(),
      },
    });

    logger.info({
      message: "Audit log created successfully",
      auditLogId: auditLog.id,
      requestId: req.requestId,
    });

    return createResponse(true, auditLog);
  } catch (error) {
    logger.error({
      message: "Error creating audit log",
      organizationId,
      requestId: req.requestId,
      error,
    });
    throw error;
  }
}

/**
 * Fetch all audit logs for the current organization
 * @param {Object} req - The request object
 * @returns {Object} The list of audit logs
 */
async function getAuditLogs(req) {
  const { organization, requestId } = req;

  if (!organization || !organization.id) {
    const error = new Error("Organization context is missing or invalid.");
    error.status = 400; // Bad Request
    throw error;
  }

  const organizationId = organization.id;

  try {
    logger.info({
      message: "Fetching audit logs",
      organizationId,
      requestId,
    });

    const auditLogs = await prisma.auditLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });

    logger.info({
      message: `Fetched ${auditLogs.length} audit logs`,
      organizationId,
      requestId,
    });

    return createResponse(true, auditLogs);
  } catch (error) {
    logger.error({
      message: "Error fetching audit logs",
      organizationId,
      requestId,
      error,
    });
    throw error;
  }
}

module.exports = {
  createAuditLog,
  getAuditLogs,
};
