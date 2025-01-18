const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("@middleware/auth");
const { organizationContext } = require('@middleware/organization');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

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

    // Build where conditions
    const where = {
      organizationId: req.organizationId // Filter by organization
    };

    if (user_id) {
      where.user_id = parseInt(user_id);
    }

    if (action) {
      where.action = {
        contains: action,
        mode: 'insensitive'
      };
    }

    if (start_date && end_date) {
      where.timestamp = {
        gte: new Date(start_date),
        lte: new Date(end_date)
      };
    }

    // Fetch audit logs with pagination
    const auditLogs = await prisma.auditLog.findMany({
      where,
      take: parseInt(limit),
      skip: parseInt(offset),
      orderBy: {
        timestamp: 'desc'
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    if (auditLogs.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "No logs found." 
      });
    }

    res.status(200).json(auditLogs);
  } catch (error) {
    console.error("Error fetching audit logs:", {
      query: req.query,
      error: error.message,
    });
    res.status(500).json({ 
      success: false, 
      error: "Internal server error." 
    });
  }
});

module.exports = router;