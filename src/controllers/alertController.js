const prisma = require("@utils/prisma");
const logger = require("@utils/logger");
const { createResponse } = require("@utils/responseHandler");
const { logAudit } = require("@utils/auditLogger");

// Fetch all alerts for an organization
exports.getAlerts = async function (req) {
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
        transaction: true,
      },
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
      error,
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

  const transaction = await prisma.transaction.findFirst({
    where: { 
      transaction_id,
      organizationId: organization.id,
    },
  });

  if (!transaction) {
    logger.warn({
      message: "Transaction not found in this organization",
      transaction_id,
      organizationId: organization.id,
      requestId,
    });
    throw new Error("Transaction not found in this organization. Cannot add alert.");
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

  // Log the action
  await logAudit(req, {
    action: `Added alert for transaction ${transaction_id}`,
  });

  return createResponse(true, alert);
};

// Delete an alert
exports.deleteAlert = async (req, id) => {
  const { organization, requestId } = req;

  logger.info({
    message: "Attempting to delete alert",
    alertId: id,
    organizationId: organization.id,
    requestId,
  });

  const deletedAlert = await prisma.alert.delete({
    where: {
      id: parseInt(id),
      organizationId: organization.id,
    },
  });

  logger.info({
    message: "Alert deleted successfully",
    alertId: id,
    requestId,
  });

  // Log the action
  await logAudit(req, {
    action: `Deleted alert with ID ${id}`,
  });

  return createResponse(true, deletedAlert);
};
