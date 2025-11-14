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
const {
  verifyWebhookSignature,
  extractSignatureFromHeaders,
} = require('@utils/webhookSignature');

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
 *         name: x-webhook-signature
 *         schema:
 *           type: string
 *         description: HMAC-SHA256 signature (sha256=hexsignature)
 *       - in: header
 *         name: x-webhook-secret
 *         schema:
 *           type: string
 *         description: Legacy webhook secret (for backward compatibility)
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
 *         description: Unauthorized - Invalid webhook signature or secret
 *       400:
 *         description: Bad request - Missing required fields
 */
router.post('/webhook', async (req, res, next) => {
  try {
    const webhookSecret = process.env.WEBHOOK_SECRET;
    const { organizationId, envelope } = req.body;

    // Validate required fields first
    if (!organizationId || !envelope) {
      return res.status(400).json({
        success: false,
        error: 'organizationId and envelope are required',
      });
    }

    // Validate webhook signature (cryptographic or legacy)
    if (webhookSecret) {
      const signature = extractSignatureFromHeaders(req.headers);
      const payload = { organizationId, envelope };

      if (signature) {
        // Verify cryptographic signature (preferred method)
        if (!verifyWebhookSignature(payload, signature, webhookSecret)) {
          logger.warn({
            message: 'Invalid webhook signature',
            ip: req.ip,
            hasSignature: true,
          });
          return res.status(401).json({
            success: false,
            error: 'Unauthorized - Invalid signature',
          });
        }
        logger.debug({
          message: 'Webhook signature verified cryptographically',
          organizationId,
        });
      } else {
        // Fallback to legacy header comparison for backward compatibility
        const providedSecret = req.headers['x-webhook-secret'];
        if (providedSecret !== webhookSecret) {
          logger.warn({
            message: 'Invalid webhook secret (legacy method)',
            ip: req.ip,
            hasSignature: false,
          });
          return res.status(401).json({
            success: false,
            error: 'Unauthorized - Invalid secret',
          });
        }
        logger.debug({
          message: 'Webhook verified using legacy secret header',
          organizationId,
        });
      }
    } else {
      logger.warn({
        message: 'WEBHOOK_SECRET not configured, accepting all webhooks',
        ip: req.ip,
      });
    }

    logger.info({
      message: 'Received crawler webhook',
      organizationId,
      jurisdiction: envelope.jurisdiction,
      crawlId: envelope.crawlId,
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
      stack: error.stack,
    });
    next(error);
  }
});

module.exports = router;

