const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("@middleware/auth");
const { organizationContext } = require("@middleware/organization");
const { apiLimiter } = require("@middleware/rateLimiter");
const { getAuditLogs } = require("@controllers/auditController");

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

module.exports = router;
