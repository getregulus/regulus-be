const Stripe = require("stripe");
const logger = require("@utils/logger");

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Price IDs for different tiers (set these in environment variables)
const PRICE_IDS = {
  startup: process.env.STRIPE_STARTUP_PRICE_ID,
  pro: process.env.STRIPE_PRO_PRICE_ID,
  enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID,
};

/**
 * Create a Stripe customer
 * @param {Object} params - Customer parameters
 * @param {string} params.email - Customer email
 * @param {string} params.name - Customer name
 * @param {Object} params.metadata - Additional metadata
 * @returns {Promise<Object>} Stripe customer object
 */
async function createCustomer({ email, name, metadata = {} }) {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata,
    });

    logger.info({
      message: "Stripe customer created",
      customerId: customer.id,
      email,
    });

    return customer;
  } catch (error) {
    logger.error({
      message: "Error creating Stripe customer",
      email,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Create a checkout session for subscription
 * @param {Object} params - Checkout session parameters
 * @param {string} params.customerId - Stripe customer ID
 * @param {string} params.priceId - Stripe price ID
 * @param {string} params.successUrl - Success redirect URL
 * @param {string} params.cancelUrl - Cancel redirect URL
 * @param {number} params.trialPeriodDays - Trial period in days (default: 7)
 * @param {Object} params.metadata - Additional metadata
 * @returns {Promise<Object>} Stripe checkout session
 */
async function createCheckoutSession({
  customerId,
  priceId,
  successUrl,
  cancelUrl,
  trialPeriodDays = 7,
  metadata = {},
}) {
  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        trial_period_days: trialPeriodDays,
        metadata,
      },
      metadata,
    });

    logger.info({
      message: "Checkout session created",
      sessionId: session.id,
      customerId,
    });

    return session;
  } catch (error) {
    logger.error({
      message: "Error creating checkout session",
      customerId,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Create a customer portal session
 * @param {Object} params - Portal session parameters
 * @param {string} params.customerId - Stripe customer ID
 * @param {string} params.returnUrl - Return URL after portal session
 * @returns {Promise<Object>} Stripe portal session
 */
async function createPortalSession({ customerId, returnUrl }) {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    logger.info({
      message: "Portal session created",
      sessionId: session.id,
      customerId,
    });

    return session;
  } catch (error) {
    logger.error({
      message: "Error creating portal session",
      customerId,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Get subscription details
 * @param {string} subscriptionId - Stripe subscription ID
 * @returns {Promise<Object>} Subscription object
 */
async function getSubscription(subscriptionId) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    logger.error({
      message: "Error retrieving subscription",
      subscriptionId,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Verify webhook signature
 * @param {string} payload - Raw request body
 * @param {string} signature - Stripe signature header
 * @returns {Object} Verified event object
 */
function verifyWebhookSignature(payload, signature) {
  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    return event;
  } catch (error) {
    logger.error({
      message: "Webhook signature verification failed",
      error: error.message,
    });
    throw error;
  }
}

module.exports = {
  stripe,
  PRICE_IDS,
  createCustomer,
  createCheckoutSession,
  createPortalSession,
  getSubscription,
  verifyWebhookSignature,
};

