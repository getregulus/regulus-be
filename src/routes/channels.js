const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("@middleware/auth");
const { organizationContext } = require("@middleware/organization");
const { validateSchema } = require("@middleware/validation");
const { apiLimiter } = require("@middleware/rateLimiter");
const Joi = require("joi");
const {
  getChannelByType,
  updateChannel,
  updateChannelSubscriptions,
} = require("@controllers/channelController");

const updateChannelSchema = Joi.object({
  name: Joi.string().min(3).max(100),
  config: Joi.object(),
  status: Joi.string().valid("active", "inactive"),
}).min(1);

const subscriptionsSchema = Joi.object({
  subscriptions: Joi.array()
    .items(
      Joi.object({
        ruleId: Joi.number().integer().required(),
        enabled: Joi.boolean().required(),
      })
    )
    .required(),
});

/**
 * @swagger
 * /channels/{channelType}:
 *   get:
 *     summary: Get channel configuration by type
 *     description: Get the configuration for a specific channel type (slack, telegram, or email)
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-organization-id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: channelType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [slack, telegram, email]
 *     responses:
 *       200:
 *         description: Channel configuration retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Channel'
 *       404:
 *         description: Channel not configured
 *       500:
 *         description: Internal server error
 */
router.get(
  "/:channelType(slack|telegram|email)",
  apiLimiter,
  authenticate,
  organizationContext,
  authorize(["admin", "auditor"]),
  async (req, res, next) => {
    try {
      const result = await getChannelByType(req);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /channels/{id}:
 *   put:
 *     summary: Update a channel
 *     tags: [Channels]
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 100
 *               config:
 *                 type: object
 *               status:
 *                 type: string
 *                 enum: ["active", "inactive"]
 *     responses:
 *       200:
 *         description: Channel updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Channel'
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
 *       404:
 *         description: Channel not found
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
router.put(
  "/:id",
  apiLimiter,
  authenticate,
  organizationContext,
  authorize(["admin"]),
  validateSchema(updateChannelSchema),
  async (req, res, next) => {
    try {
      const result = await updateChannel(req, req.params.id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);


/**
 * @swagger
 * /channels/{channelType}/subscriptions:
 *   put:
 *     summary: Update subscriptions for a channel
 *     description: Subscribe rules to a specific channel type (slack, telegram, or email)
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-organization-id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: channelType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [slack, telegram, email]
 *         example: slack
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subscriptions
 *             properties:
 *               subscriptions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - ruleId
 *                     - enabled
 *                   properties:
 *                     ruleId:
 *                       type: integer
 *                       example: 1
 *                     enabled:
 *                       type: boolean
 *                       example: true
 *     responses:
 *       200:
 *         description: Subscriptions updated successfully
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
 *                     channelId:
 *                       type: string
 *                     channelType:
 *                       type: string
 *                     subscriptions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           ruleId:
 *                             type: integer
 *                           enabled:
 *                             type: boolean
 *                           ruleName:
 *                             type: string
 *       400:
 *         description: Validation error
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
 *       404:
 *         description: Channel not found
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
router.put(
  "/:channelType(slack|telegram|email)/subscriptions",
  apiLimiter,
  authenticate,
  organizationContext,
  authorize(["admin"]),
  validateSchema(subscriptionsSchema),
  async (req, res, next) => {
    try {
      const result = await updateChannelSubscriptions(req);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;

