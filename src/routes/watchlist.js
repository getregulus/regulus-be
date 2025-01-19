const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("@middleware/auth");
const { organizationContext } = require('@middleware/organization');
const { validateSchema } = require('@middleware/validation');
const { apiLimiter } = require('@middleware/rateLimiter');
const Joi = require("joi");
const {
  getEntries,
  addEntry,
  removeEntry
} = require("@controllers/watchlistController");

const addEntrySchema = Joi.object({
  identifier: Joi.string().max(255).required(),
  category: Joi.string().valid('user', 'merchant', 'ip').required(),
  risk: Joi.string().valid('low', 'medium', 'high').required(),
  reason: Joi.string().max(1000).required(),
  expires_at: Joi.date().iso()
});

const querySchema = Joi.object({
  category: Joi.string().valid('user', 'merchant', 'ip'),
  risk: Joi.string().valid('low', 'medium', 'high'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10)
});

/**
 * @swagger
 * /watchlist:
 *   get:
 *     summary: Get watchlist entries
 *     tags: [Watchlist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-organization-id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [user, merchant, ip]
 *       - in: query
 *         name: risk
 *         schema:
 *           type: string
 *           enum: [low, medium, high]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *     responses:
 *       200:
 *         description: List of watchlist entries
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
 *                     entries:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/WatchlistEntry'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
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
 *       429:
 *         description: Too many requests
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
 *
 *   post:
 *     summary: Add entry to watchlist
 *     tags: [Watchlist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-organization-id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *               - category
 *               - risk
 *               - reason
 *             properties:
 *               identifier:
 *                 type: string
 *                 maxLength: 255
 *                 example: "user_123"
 *               category:
 *                 type: string
 *                 enum: [user, merchant, ip]
 *               risk:
 *                 type: string
 *                 enum: [low, medium, high]
 *               reason:
 *                 type: string
 *                 maxLength: 1000
 *                 example: "Suspicious activity detected"
 *               expires_at:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-12-31T23:59:59Z"
 *     responses:
 *       201:
 *         description: Entry added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/WatchlistEntry'
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
 *       409:
 *         description: Entry already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many requests
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

/**
 * @swagger
 * /watchlist/{id}:
 *   delete:
 *     summary: Remove entry from watchlist
 *     tags: [Watchlist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-organization-id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Entry removed successfully
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
 *                     message:
 *                       type: string
 *                       example: "Watchlist entry removed successfully"
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
 *       404:
 *         description: Entry not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many requests
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
router.get("/", 
  apiLimiter,
  authenticate, 
  organizationContext, 
  authorize(["auditor", "admin"]),
  validateSchema(querySchema, { property: 'query' }),
  async (req, res, next) => {
    try {
      const result = await getEntries(req);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
});

router.post("/", 
  apiLimiter,
  authenticate, 
  organizationContext, 
  authorize(["admin"]),
  validateSchema(addEntrySchema),
  async (req, res, next) => {
    try {
      const result = await addEntry(req);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
});

router.delete("/:id", 
  apiLimiter,
  authenticate, 
  organizationContext, 
  authorize(["admin"]),
  validateSchema(Joi.object({
    id: Joi.number().integer().required()
  }), { property: 'params' }),
  async (req, res, next) => {
    try {
      const result = await removeEntry(req, req.params.id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
});

module.exports = router;
