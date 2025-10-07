const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("@middleware/auth");
const { organizationContext } = require("@middleware/organization");
const { apiLimiter } = require("@middleware/rateLimiter");
const { validateSchema } = require("@middleware/validation");
const Joi = require("joi");
const { getAlerts, deleteAlert, addAlert, exportAlertsCSV } = require("@controllers/alertController");

/**
 * @swagger
 * /alerts:
 *   get:
 *     summary: Get all alerts
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-organization-id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of alerts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Alert'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get(
  "/",
  apiLimiter,
  authenticate,
  organizationContext,
  authorize(["admin", "auditor"]),
  async (req, res, next) => {
    try {
      const result = await getAlerts(req);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Validation schema for adding an alert
const addAlertSchema = Joi.object({
  transaction_id: Joi.string().required(),
  reason: Joi.string().max(1000).required(),
});

/**
 * @swagger
 * /alerts:
 *   post:
 *     summary: Add a new alert
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-organization-id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - transaction_id
 *               - reason
 *             properties:
 *               transaction_id:
 *                 type: string
 *                 example: "txn_123456"
 *               reason:
 *                 type: string
 *                 maxLength: 1000
 *                 example: "Suspicious activity detected"
 *     responses:
 *       201:
 *         description: Alert added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     transaction_id:
 *                       type: string
 *                       example: "txn_123456"
 *                     reason:
 *                       type: string
 *                       example: "Suspicious activity detected"
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Invalid organization or insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/",
  apiLimiter,
  authenticate,
  organizationContext,
  authorize(["admin"]),
  validateSchema(addAlertSchema),
  async (req, res, next) => {
    try {
      const result = await addAlert(req);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /alerts/export:
 *   get:
 *     summary: Export alerts as CSV
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-organization-id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: CSV file with all alerts
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               example: |
 *                 "Alert ID","Transaction ID","User ID","Amount","Currency","Country","Transaction Timestamp","Alert Reason","Flagged At"
 *                 "1","txn_123","user_456","15000.00","USD","US","2025-01-15T10:30:00.000Z","High value transaction","2025-01-15T10:30:05.000Z"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get(
  "/export",
  apiLimiter,
  authenticate,
  organizationContext,
  authorize(["admin", "auditor"]),
  async (req, res, next) => {
    try {
      const csvContent = await exportAlertsCSV(req);
      
      // Set headers for CSV download
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="alerts-export-${Date.now()}.csv"`);
      
      res.status(200).send(csvContent);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /alerts/{id}:
 *   delete:
 *     summary: Delete an alert
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-organization-id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Alert deleted successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.delete(
  "/:id",
  apiLimiter,
  authenticate,
  organizationContext,
  authorize(["admin"]),
  async (req, res, next) => {
    try {
      const result = await deleteAlert(req, req.params.id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
