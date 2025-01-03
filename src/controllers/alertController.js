const db = require("@models/db");
const logger = require("@utils/logger");

exports.getAlerts = async (req, res) => {
  try {
    logger.info("Fetching all alerts");
    const { rows } = await db.query(
      "SELECT * FROM alerts ORDER BY flagged_at DESC"
    );
    res.status(200).json(rows);
    logger.info(`Fetched ${rows.length} alerts successfully`);
  } catch (error) {
    logger.error(`Error in fetching alerts: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createAlert = async (transaction_id, reason) => {
  try {
    await db.query(
      `INSERT INTO alerts (transaction_id, reason) VALUES ($1, $2)`,
      [transaction_id, reason]
    );
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

exports.deleteAlert = async (req, res) => {
  const { id } = req.params;

  try {
    logger.info(`Attempting to delete alert with ID: ${id}`);
    const { rowCount } = await db.query("DELETE FROM alerts WHERE id = $1", [
      id,
    ]);
    if (rowCount === 0) {
      logger.warn(`Alert with ID ${id} not found`);
      return res
        .status(404)
        .json({ success: false, message: "Alert not found." });
    }
    res
      .status(200)
      .json({ success: true, message: "Alert deleted successfully!" });
    logger.info(`Alert with ID ${id} deleted successfully`);
  } catch (error) {
    logger.error(`Error in deleting alert with ID ${id}: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
};
