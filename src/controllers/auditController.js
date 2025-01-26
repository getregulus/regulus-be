const prisma = require("@utils/prisma");
const logger = require("@utils/logger");
const { createResponse } = require("@utils/responseHandler");

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
  getAuditLogs,
};
