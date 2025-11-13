const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('@middleware/auth');
const { organizationContext } = require('@middleware/organization');
const { validateSchema } = require('@middleware/validation');
const { apiLimiter } = require('@middleware/rateLimiter');
const Joi = require('joi');
const crawlerController = require('@controllers/crawlerController');
const ruleImporter = require('@services/ruleImporter');
const logger = require('@utils/logger');
const crypto = require('crypto');

// Validation schemas
const triggerCrawlSchema = Joi.object({
  jurisdiction: Joi.string().required(),
});

/**
 * @swagger
 * /crawlers/trigger:
 *   post:
 *     summary: Trigger crawler for organization/jurisdiction
 *     tags: [Crawlers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-organization-id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Organization ID (required for organization context)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - jurisdiction
 *             properties:
 *               jurisdiction:
 *                 type: string
 *                 example: "uk"
 *     responses:
 *       200:
 *         description: Crawler triggered successfully
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
 *                     crawlId:
 *                       type: string
 *                     status:
 *                       type: string
 *                       example: "RUNNING"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.post(
  '/trigger',
  apiLimiter,
  authenticate,
  organizationContext,
  authorize(['admin']),
  validateSchema(triggerCrawlSchema),
  async (req, res, next) => {
    try {
      const result = await crawlerController.triggerCrawl(req);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /crawlers/webhook:
 *   post:
 *     summary: Receive crawler results from orchestrator (internal)
 *     tags: [Crawlers]
 *     parameters:
 *       - in: header
 *         name: x-webhook-secret
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
 *               - organizationId
 *               - envelope
 *             properties:
 *               organizationId:
 *                 type: integer
 *               envelope:
 *                 type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       401:
 *         description: Unauthorized - Invalid webhook secret
 *       400:
 *         description: Bad request - Missing required fields
 */
router.post('/webhook', async (req, res, next) => {
  try {
    // Validate webhook signature
    const webhookSecret = process.env.WEBHOOK_SECRET;
    const providedSecret = req.headers['x-webhook-secret'];

    if (webhookSecret && providedSecret !== webhookSecret) {
      logger.warn({
        message: 'Invalid webhook secret',
        ip: req.ip,
      });
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { organizationId, envelope } = req.body;

    if (!organizationId || !envelope) {
      return res.status(400).json({
        success: false,
        error: 'organizationId and envelope are required',
      });
    }

    logger.info({
      message: 'Received crawler webhook',
      organizationId,
      jurisdiction: envelope.jurisdiction,
      rulesCount: envelope.rules?.length || 0,
    });

    // Import rules
    const result = await ruleImporter.importRules(organizationId, envelope);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error({
      message: 'Error processing crawler webhook',
      error: error.message,
    });
    next(error);
  }
});

module.exports = router;

