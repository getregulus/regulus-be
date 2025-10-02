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
const {
  initiateSlackOAuth,
  handleSlackCallback,
  getSlackChannels,
  updateSlackChannel,
  disconnectSlack,
} = require("@controllers/slackController");
const { sendTestNotification } = require("@utils/notificationService");

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

/**
 * @swagger
 * /channels/slack/connect:
 *   get:
 *     summary: Initiate Slack OAuth connection
 *     description: Returns the Slack authorization URL to redirect user for OAuth flow
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-organization-id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Authorization URL generated
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
 *                     authorizationUrl:
 *                       type: string
 *                       example: "https://slack.com/oauth/v2/authorize?client_id=..."
 *                     state:
 *                       type: string
 *       500:
 *         description: Internal server error
 */
router.get(
  "/slack/connect",
  apiLimiter,
  authenticate,
  organizationContext,
  authorize(["admin"]),
  async (req, res, next) => {
    try {
      const result = await initiateSlackOAuth(req);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /channels/slack/callback:
 *   get:
 *     summary: Slack OAuth callback
 *     description: Handles the OAuth callback from Slack and exchanges code for access token
 *     tags: [Channels]
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: state
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully connected Slack workspace
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *       400:
 *         description: Missing code or state parameter
 *       500:
 *         description: Internal server error
 */
router.get("/slack/callback", async (req, res, next) => {
  try {
    const { code, state, error } = req.query;

    // Handle OAuth denial
    if (error) {
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Slack Connection Failed</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .error { color: #d32f2f; }
            </style>
          </head>
          <body>
            <h1 class="error">❌ Connection Failed</h1>
            <p>Slack authorization was denied or cancelled.</p>
            <p>Error: ${error}</p>
            <p>You can close this window and try again.</p>
          </body>
        </html>
      `);
    }

    if (!code || !state) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invalid Request</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .error { color: #d32f2f; }
            </style>
          </head>
          <body>
            <h1 class="error">❌ Invalid Request</h1>
            <p>Missing required parameters (code or state).</p>
            <p>You can close this window and try again.</p>
          </body>
        </html>
      `);
    }

    const result = await handleSlackCallback(code, state);

    // Return success HTML page
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Slack Connected</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .success { color: #2e7d32; }
          </style>
        </head>
        <body>
          <h1 class="success">✅ Slack Connected Successfully!</h1>
          <p>Your Slack workspace "${result.data.teamName}" has been connected.</p>
          <p>You can now close this window and return to the application.</p>
          <script>
            // Auto-close after 3 seconds
            setTimeout(() => {
              window.close();
            }, 3000);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Error</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .error { color: #d32f2f; }
          </style>
        </head>
        <body>
          <h1 class="error">❌ Connection Error</h1>
          <p>${error.message}</p>
          <p>You can close this window and try again.</p>
        </body>
      </html>
    `);
  }
});

/**
 * @swagger
 * /channels/slack/channels:
 *   get:
 *     summary: Get available Slack channels
 *     description: Returns list of channels from the connected Slack workspace
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-organization-id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of Slack channels
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
 *                     channels:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           isPrivate:
 *                             type: boolean
 *                           isMember:
 *                             type: boolean
 *                     teamName:
 *                       type: string
 *       404:
 *         description: Slack not connected
 *       500:
 *         description: Internal server error
 */
router.get(
  "/slack/channels",
  apiLimiter,
  authenticate,
  organizationContext,
  authorize(["admin"]),
  async (req, res, next) => {
    try {
      const result = await getSlackChannels(req);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /channels/slack/select-channel:
 *   put:
 *     summary: Select Slack channel for notifications
 *     description: Set which Slack channel should receive alert notifications
 *     tags: [Channels]
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
 *               - channelId
 *               - channelName
 *             properties:
 *               channelId:
 *                 type: string
 *                 example: "C1234567890"
 *               channelName:
 *                 type: string
 *                 example: "#alerts"
 *     responses:
 *       200:
 *         description: Slack channel updated successfully
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
 *                       type: integer
 *                     selectedChannel:
 *                       type: string
 *                     selectedChannelName:
 *                       type: string
 *                     message:
 *                       type: string
 *       404:
 *         description: Slack not connected
 *       500:
 *         description: Internal server error
 */
router.put(
  "/slack/select-channel",
  apiLimiter,
  authenticate,
  organizationContext,
  authorize(["admin"]),
  async (req, res, next) => {
    try {
      const result = await updateSlackChannel(req);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /channels/slack/disconnect:
 *   delete:
 *     summary: Disconnect Slack workspace
 *     description: Deactivates the Slack integration for the organization
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-organization-id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Slack disconnected successfully
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
 *       404:
 *         description: Slack channel not found
 *       500:
 *         description: Internal server error
 */
router.delete(
  "/slack/disconnect",
  apiLimiter,
  authenticate,
  organizationContext,
  authorize(["admin"]),
  async (req, res, next) => {
    try {
      const result = await disconnectSlack(req);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /channels/{id}/test:
 *   post:
 *     summary: Send a test notification
 *     description: Sends a test alert to verify channel configuration
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
 *     responses:
 *       200:
 *         description: Test notification sent successfully
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
 *       404:
 *         description: Channel not found
 *       500:
 *         description: Internal server error
 */
router.post(
  "/:id/test",
  apiLimiter,
  authenticate,
  organizationContext,
  authorize(["admin"]),
  async (req, res, next) => {
    try {
      const result = await sendTestNotification(
        parseInt(req.params.id),
        req.organization.id
      );
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;

