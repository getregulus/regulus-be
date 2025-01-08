const prisma = require('@utils/prisma');
const logger = require("@utils/logger");

// Fetch all alerts
exports.getAlerts = async (req, res) => {
  try {
    logger.info("Fetching all alerts");
    const alerts = await prisma.alert.findMany({
      orderBy: { flagged_at: "desc" },
    });
  
    res.status(200).json(alerts);
    logger.info(`Fetched ${rows.length} alerts successfully`);
  } catch (error) {
    logger.error(`Error fetching alerts: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create a new alert
exports.createAlert = async (transaction_id, reason) => {
  try {
    await prisma.alert.create({
      data: {
        transaction_id,
        reason,
      },
    });
    logger.info(
      `Alert created for transaction: ${transaction_id} - Reason: ${reason}`
    );
  } catch (error) {
    logger.error(
      `Error in creating alert for transaction ${transaction_id}: ${error.message}`
    );
    throw new Error("Failed to create alert.");
  }
};

// Delete an alert
exports.deleteAlert = async (req, res) => {
  const { id } = req.params;

  try {
    logger.info(`Attempting to delete alert with ID: ${id}`);
    const deletedAlert = await prisma.alert.delete({
      where: { id: parseInt(id) },
    });

    res
      .status(200)
      .json({ success: true, message: "Alert deleted successfully!" });
    logger.info(`Alert with ID ${id} deleted successfully`);
  } catch (error) {
    if (error.code === "P2025") {
      logger.warn(`Alert with ID ${id} not found`);
      return res
        .status(404)
        .json({ success: false, message: "Alert not found." });
    }
    logger.error(`Error in deleting alert with ID ${id}: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
};
