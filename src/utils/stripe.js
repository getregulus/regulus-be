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
 * @param {string} params.idempotencyKey - Optional idempotency key for retries
 * @returns {Promise<Object>} Stripe customer object
 */
async function createCustomer({ email, name, metadata = {}, idempotencyKey }) {
  try {
    const options = {
      email,
      name,
      metadata,
    };

    const requestOptions = idempotencyKey ? { idempotencyKey } : {};

    const customer = await stripe.customers.create(options, requestOptions);

    logger.info({
      message: "Stripe customer created",
      customerId: customer.id,
      email,
      idempotencyKey: idempotencyKey || 'none',
    });

    return customer;
  } catch (error) {
    logger.error({
      message: "Error creating Stripe customer",
      email,
      error: error.message,
      idempotencyKey: idempotencyKey || 'none',
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
    // Build subscription_data conditionally
    const subscriptionData = { metadata };
    
    // Only include trial_period_days if it's a valid value (> 0)
    if (trialPeriodDays && trialPeriodDays > 0) {
      subscriptionData.trial_period_days = trialPeriodDays;
    }
    
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
      subscription_data: subscriptionData, 
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
 * Create a subscription with trial period
 * @param {Object} params - Subscription parameters
 * @param {string} params.customerId - Stripe customer ID
 * @param {string} params.priceId - Stripe price ID
 * @param {number} params.trialPeriodDays - Trial period in days
 * @param {Object} params.metadata - Additional metadata
 * @param {string} params.idempotencyKey - Optional idempotency key for retries
 * @returns {Promise<Object>} Stripe subscription object
 */
async function createSubscription({
  customerId,
  priceId,
  trialPeriodDays = 7,
  metadata = {},
  idempotencyKey,
}) {
  try {
    // Create subscription with trial - no payment required during trial
    // When trial ends, Stripe will attempt to charge the customer
    const options = {
      customer: customerId,
      items: [{ price: priceId }],
      trial_period_days: trialPeriodDays,
      // Allow subscription to be created without payment method during trial
      payment_behavior: 'allow_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      metadata,
    };

    const requestOptions = idempotencyKey ? { idempotencyKey } : {};

    const subscription = await stripe.subscriptions.create(options, requestOptions);

    logger.info({
      message: "Stripe subscription created with trial",
      subscriptionId: subscription.id,
      customerId,
      status: subscription.status,
      trialStart: subscription.trial_start,
      trialEnd: subscription.trial_end,
      currentPeriodStart: subscription.current_period_start,
      currentPeriodEnd: subscription.current_period_end,
      idempotencyKey: idempotencyKey || 'none',
    });

    return subscription;
  } catch (error) {
    logger.error({
      message: "Error creating subscription",
      customerId,
      error: error.message,
      idempotencyKey: idempotencyKey || 'none',
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
  createSubscription,
  createCheckoutSession,
  createPortalSession,
  getSubscription,
  verifyWebhookSignature,
};

