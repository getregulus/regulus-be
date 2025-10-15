const prisma = require("@utils/prisma");
const logger = require("@utils/logger");
const { createResponse } = require("@utils/responseHandler");
const { logAudit } = require("@utils/auditLogger");

// Fetch all alerts for an organization with pagination
exports.getAlerts = async function (req) {
  const { organization, requestId } = req;
  const organizationId = organization.id;

  // Parse and validate pagination parameters with defaults and max limit
  const MAX_LIMIT = 100;
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 25, 1), MAX_LIMIT);
  const offset = (page - 1) * limit;

  try {
    logger.info({
      message: "Fetching alerts for organization",
      organizationId,
      page,
      limit,
      requestId,
    });

    // Get total count for pagination metadata
    const total = await prisma.alert.count({
      where: { organizationId },
    });

    // Fetch paginated alerts
    const alerts = await prisma.alert.findMany({
      where: { organizationId },
      orderBy: { flagged_at: "desc" },
      include: {
        transaction: true,
      },
      skip: offset,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    logger.info({
      message: `Fetched ${alerts.length} alerts successfully (page ${page}/${totalPages})`,
      requestId,
    });

    return {
      success: true,
      page,
      limit,
      total,
      totalPages,
      data: alerts,
    };
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

// Export alerts as CSV
exports.exportAlertsCSV = async (req) => {
  const { organization, requestId } = req;
  const organizationId = organization.id;

  try {
    logger.info({
      message: "Exporting alerts as CSV for organization",
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

    // CSV header
    const headers = [
      "Alert ID",
      "Transaction ID",
      "User ID",
      "Amount",
      "Currency",
      "Country",
      "Transaction Timestamp",
      "Alert Reason",
      "Flagged At",
    ];

    // Convert alerts to CSV rows
    const rows = alerts.map((alert) => [
      alert.id,
      alert.transaction_id,
      alert.transaction.user_id,
      alert.transaction.amount,
      alert.transaction.currency,
      alert.transaction.country,
      alert.transaction.timestamp.toISOString(),
      alert.reason.replace(/"/g, '""'), // Escape double quotes in CSV
      alert.flagged_at.toISOString(),
    ]);

    // Build CSV string
    const csvContent = [
      headers.map((h) => `"${h}"`).join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    logger.info({
      message: `Exported ${alerts.length} alerts as CSV successfully`,
      requestId,
    });

    // Log the action
    await logAudit(req, {
      action: `Exported ${alerts.length} alerts as CSV`,
    });

    return csvContent;
  } catch (error) {
    logger.error({
      message: "Error exporting alerts as CSV",
      organizationId,
      requestId,
      error,
    });
    throw error;
  }
};
