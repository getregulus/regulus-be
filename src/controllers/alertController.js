const prisma = require("@utils/prisma");
const logger = require("@utils/logger");
const { createResponse } = require("@utils/responseHandler");

// Fetch all alerts for an organization
exports.getAlerts = async function(req) {
  const { organization, requestId } = req;
  const organizationId = organization.id;

  try {
    logger.info({
      message: "Fetching alerts for organization",
      organizationId,
      requestId,
    });

    const alerts = await prisma.alert.findMany({
      where: { organizationId },
      orderBy: { flagged_at: "desc" },
      include: {
        transaction: true
      }
    });

    logger.info({
      message: `Fetched ${alerts.length} alerts successfully`,
      requestId,
    });

    return createResponse(true, alerts);
  } catch (error) {
    logger.error({
      message: "Error fetching alerts",
      organizationId,
      requestId,
      error
    });
    throw error;
  }
};

// Delete an alert
exports.deleteAlert = async (req, id) => {
  const { organizationId, requestId } = req;

  logger.info({
    message: "Attempting to delete alert",
    alertId: id,
    organizationId,
    requestId,
  });

  const deletedAlert = await prisma.alert.delete({
    where: {
      id: parseInt(id),
      organizationId,
    },
  });

  logger.info({
    message: "Alert deleted successfully",
    alertId: id,
    requestId,
  });

  return createResponse(true, deletedAlert);
};
