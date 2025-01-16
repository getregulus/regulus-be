const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("@middleware/auth");
const { organizationContext } = require('@middleware/organization');
const db = require("@models/db");

/**
 * @swagger
 * /audit_logs:
 *   get:
 *     summary: Get all audit logs (Admin Only)
 *     tags:
 *       - Audit Logs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-organization-id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: integer
 *         description: Filter logs by user ID
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter logs by action keyword
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering logs
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering logs
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of logs to return per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of logs to skip for pagination
 *     responses:
 *       200:
 *         description: List of audit logs.
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
 *                   user_id:
 *                     type: integer
 *                     example: 2
 *                   action:
 *                     type: string
 *                     example: "Created Rule"
 *                   target_id:
 *                     type: integer
 *                     example: 5
 *                   target_type:
 *                     type: string
 *                     example: "rule"
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *                     example: "2025-01-04T12:00:00Z"
 *       404:
 *         description: No logs found.
 *       500:
 *         description: Internal server error.
 */
router.get("/", authenticate, organizationContext, authorize(["admin"]), async (req, res) => {
  try {
    const {
      user_id,
      action,
      start_date,
      end_date,
      limit = 10,
      offset = 0,
    } = req.query;

    // Build dynamic conditions
    const conditions = []; // No longer filtering by organization
    const values = []; // No longer using organizationId
    let counter = 1; // Start counter at 1

    if (user_id) {
      conditions.push(`user_id = $${counter++}`);
      values.push(user_id);
    }

    if (action) {
      conditions.push(`action ILIKE $${counter++}`);
      values.push(`%${action}%`);
    }

    if (start_date && end_date) {
      conditions.push(`timestamp BETWEEN $${counter++} AND $${counter++}`);
      values.push(start_date, end_date);
    }

    // Construct the query
    const query = `
      SELECT * FROM audit_logs
      ${conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""}
      ORDER BY timestamp DESC
      LIMIT $${counter++} OFFSET $${counter++}
    `;

    values.push(limit, offset);

    const { rows } = await db.query(query, values);

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No logs found." });
    }

    res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching audit logs:", {
      query: req.query,
      error: error.message,
    });
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});

module.exports = router;