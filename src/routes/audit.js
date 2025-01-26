const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("@middleware/auth");
const { organizationContext } = require("@middleware/organization");
const { apiLimiter } = require("@middleware/rateLimiter");
const { getAuditLogs, createAuditLog } = require("@controllers/auditController");

/**
 * @swagger
 * /audit:
 *   get:
 *     summary: Get organization audit logs
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-organization-id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Organization ID
 *     responses:
 *       200:
 *         description: List of audit logs
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Not a member of the organization
 *       404:
 *         description: Organization not found
 *       500:
 *         description: Internal server error
 */
router.get(
  "/",
  apiLimiter,
  authenticate,
  organizationContext,
  authorize(["admin"]),
  async (req, res, next) => {
    try {
      const result = await getAuditLogs(req);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /audit:
 *   post:
 *     summary: Create a new audit log entry
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-organization-id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Organization ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *                 description: The action performed
 *                 example: "User logged in"
 *               userId:
 *                 type: integer
 *                 description: ID of the user performing the action
 *                 example: 1
 *     responses:
 *       201:
 *         description: Audit log created successfully
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
 *                       description: The ID of the created audit log
 *                     userId:
 *                       type: integer
 *                       description: The ID of the user who performed the action
 *                     action:
 *                       type: string
 *                       description: The action performed
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: When the audit log was created
 *       400:
 *         description: Bad Request - Invalid input
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Not a member of the organization
 *       500:
 *         description: Internal server error
 */
router.post(
  "/",
  apiLimiter,
  authenticate,
  organizationContext,
  async (req, res, next) => {
    try {
      const result = await createAuditLog(req);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
