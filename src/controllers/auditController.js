const prisma = require("@utils/prisma");
const logger = require("@utils/logger");
const { createResponse } = require("@utils/responseHandler");

async function getAuditLogs(req) {
  const { organization, requestId } = req;
  const organizationId = organization.id;

  try {
    logger.info({
      message: "Fetching audit logs",
      organizationId,
      requestId,
    });

    const auditLogs = await prisma.auditLog.findMany({
      where: { organizationId },
      orderBy: { timestamp: "desc" },
      select: {
        id: true,
        action: true,
        user_id: true,
        target_id: true,
        target_type: true,
        timestamp: true,
      },
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
