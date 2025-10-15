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
 *     summary: Get organization audit logs with pagination
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
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 25
 *         description: Number of items per page (max 100)
 *     responses:
 *       200:
 *         description: Paginated list of audit logs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 total:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AuditLog'
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
