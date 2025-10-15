const prisma = require("@utils/prisma");
const logger = require("@utils/logger");
const { createResponse } = require("@utils/responseHandler");

/**
 * Fetch all audit logs for the current organization with pagination
 * @param {Object} req - The request object
 * @returns {Object} The paginated list of audit logs
 */
async function getAuditLogs(req) {
  const { organization, requestId } = req;

  if (!organization || !organization.id) {
    const error = new Error("Organization context is missing or invalid.");
    error.status = 400; // Bad Request
    throw error;
  }

  const organizationId = organization.id;
  
  // Parse and validate pagination parameters with defaults and max limit
  const MAX_LIMIT = 100;
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 25, 1), MAX_LIMIT);
  const offset = (page - 1) * limit;

  try {
    logger.info({
      message: "Fetching audit logs",
      organizationId,
      page,
      limit,
      requestId,
    });

    // Get total count for pagination metadata
    const total = await prisma.auditLog.count({
      where: { organizationId },
    });

    // Fetch paginated audit logs
    const auditLogs = await prisma.auditLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    logger.info({
      message: `Fetched ${auditLogs.length} audit logs (page ${page}/${totalPages})`,
      organizationId,
      requestId,
    });

    return {
      success: true,
      page,
      limit,
      total,
      totalPages,
      data: auditLogs,
    };
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
