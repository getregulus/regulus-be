const db = require("../models/db");

exports.getAlerts = async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM alerts ORDER BY flagged_at DESC"
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error in fetching alerts:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createAlert = async (transaction_id, reason) => {
  try {
    await db.query(
      `INSERT INTO alerts (transaction_id, reason) VALUES ($1, $2)`,
      [transaction_id, reason]
    );
    console.log(`Alert created for transaction: ${transaction_id}`);
  } catch (error) {
    console.error("Error in creating alert:", error.message);
    throw new Error("Failed to create alert.");
  }
};

exports.deleteAlert = async (req, res) => {
  const { id } = req.params;

  try {
    const { rowCount } = await db.query("DELETE FROM alerts WHERE id = $1", [
      id,
    ]);
    if (rowCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Alert not found." });
    }
    res
      .status(200)
      .json({ success: true, message: "Alert deleted successfully!" });
  } catch (error) {
    console.error("Error in deleting alert:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};
