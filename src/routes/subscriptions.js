const express = require("express");
const router = express.Router();
const { authenticate } = require("@middleware/auth");
const { organizationContext } = require("@middleware/organization");
const subscriptionController = require("@controllers/subscriptionController");

/**
 * @swagger
 * tags:
 *   name: Subscriptions
 *   description: Subscription management endpoints
 */

/**
 * @swagger
 * /subscriptions/create-checkout-session:
 *   post:
 *     summary: Create a Stripe checkout session
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - organizationId
 *             properties:
 *               organizationId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Checkout session created
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden
 */
router.post(
  "/create-checkout-session",
  authenticate,
  async (req, res, next) => {
    try {
      const result = await subscriptionController.createCheckoutSession(req);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /subscriptions/{organizationId}:
 *   get:
 *     summary: Get subscription status for an organization
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Subscription status
 *       404:
 *         description: Subscription not found
 */
router.get("/:organizationId", authenticate, async (req, res, next) => {
  try {
    const result = await subscriptionController.getSubscriptionStatus(
      req,
      req.params.organizationId
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /subscriptions/create-portal-session:
 *   post:
 *     summary: Create a Stripe customer portal session
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - organizationId
 *             properties:
 *               organizationId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Portal session created
 *       404:
 *         description: Subscription not found
 */
router.post(
  "/create-portal-session",
  authenticate,
  async (req, res, next) => {
    try {
      const result = await subscriptionController.createCustomerPortalSession(
        req
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;

