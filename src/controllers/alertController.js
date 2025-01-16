const prisma = require('@utils/prisma');
const logger = require("@utils/logger");

// Fetch all alerts for an organization
exports.getAlerts = async (organizationId) => {
  try {
    logger.info("Fetching alerts for organization", { organizationId });
    const alerts = await prisma.alert.findMany({
      where: { organizationId },
      orderBy: { flagged_at: "desc" },
      include: {
        transaction: true
      }
    });
  
    logger.info(`Fetched ${alerts.length} alerts successfully`);
    return alerts;
  } catch (error) {
    logger.error(`Error fetching alerts: ${error.message}`);
    throw new Error("Failed to fetch alerts");
  }
};

// Create a new alert
exports.createAlert = async (transaction_id, reason, organizationId) => {
  try {
    const alert = await prisma.alert.create({
      data: {
        transaction_id,
        reason,
        organizationId
      },
    });
    logger.info(
      `Alert created for transaction: ${transaction_id} - Reason: ${reason}`
    );
    return alert;
  } catch (error) {
    logger.error(
      `Error in creating alert for transaction ${transaction_id}: ${error.message}`
    );
    throw new Error("Failed to create alert.");
  }
};

// Delete an alert
exports.deleteAlert = async (id, organizationId) => {
  try {
    logger.info(`Attempting to delete alert with ID: ${id}`);
    const deletedAlert = await prisma.alert.delete({
      where: { 
        id: parseInt(id),
        organizationId // Ensure alert belongs to organization
      },
    });

    logger.info(`Alert with ID ${id} deleted successfully`);
    return deletedAlert;
  } catch (error) {
    if (error.code === "P2025") {
      logger.warn(`Alert with ID ${id} not found`);
      throw new Error("Alert not found.");
    }
    logger.error(`Error in deleting alert with ID ${id}: ${error.message}`);
    throw new Error("Failed to delete alert.");
  }
};
