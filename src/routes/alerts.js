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
    const { rows } = await db.query("SELECT * FROM alerts");
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error in fetching alerts:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
