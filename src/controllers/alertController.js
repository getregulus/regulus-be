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

// Add a new alert
exports.addAlert = async (req) => {
  const { organization, requestId } = req;
  const { transaction_id, reason } = req.body;

  logger.info({
    message: "Adding alert",
    transaction_id,
    organizationId: organization.id,
    requestId,
  });

  // Check if the transaction exists
  const transaction = await prisma.transaction.findUnique({
    where: { transaction_id },
  });

  if (!transaction) {
    logger.warn({
      message: "Transaction not found",
      transaction_id,
      organizationId: organization.id,
      requestId,
    });
    throw new Error("Transaction not found. Cannot add alert.");
  }

  const alert = await prisma.alert.create({
    data: {
      transaction_id,
      reason,
      organizationId: organization.id,
    },
  });

  logger.info({
    message: "Alert added successfully",
    alertId: alert.id,
    requestId,
  });

  return createResponse(true, alert);
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
