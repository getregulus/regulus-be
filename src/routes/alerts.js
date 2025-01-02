const express = require("express");
const router = express.Router();
const db = require("../models/db");

/**
 * @swagger
 * /alerts:
 *   get:
 *     summary: Get all alerts
 *     tags: [Alerts]
 *     responses:
 *       200:
 *         description: List of all alerts.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   transaction_id:
 *                     type: string
 *                     example: txn_0001
 *                   reason:
 *                     type: string
 *                     example: "Transaction flagged due to high value"
 *                   flagged_at:
 *                     type: string
 *                     format: date-time
 *                     example: 2025-01-01T12:00:00Z
 */
router.get("/", async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM alerts ORDER BY flagged_at DESC"
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error in fetching alerts:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /alerts:
 *   post:
 *     summary: Create a new alert
 *     tags: [Alerts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               transaction_id:
 *                 type: string
 *                 example: txn_0001
 *               reason:
 *                 type: string
 *                 example: "Transaction flagged due to high value"
 *     responses:
 *       201:
 *         description: Alert created successfully.
 *       400:
 *         description: Validation or database error.
 *       500:
 *         description: Internal server error.
 */
router.post("/", async (req, res) => {
  const { transaction_id, reason } = req.body;

  if (!transaction_id || !reason) {
    return res
      .status(400)
      .json({ success: false, error: "Missing required fields." });
  }

  try {
    await db.query(
      `INSERT INTO alerts (transaction_id, reason) VALUES ($1, $2)`,
      [transaction_id, reason]
    );
    res
      .status(201)
      .json({ success: true, message: "Alert created successfully!" });
  } catch (error) {
    console.error("Error in creating alert:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /alerts/{id}:
 *   delete:
 *     summary: Delete an alert by ID
 *     tags: [Alerts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the alert to delete
 *     responses:
 *       200:
 *         description: Alert deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Alert deleted successfully!
 *       404:
 *         description: Alert not found.
 *       500:
 *         description: Internal server error.
 */
router.delete("/:id", async (req, res) => {
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
});

module.exports = router;
