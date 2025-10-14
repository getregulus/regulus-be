const prisma = require("@utils/prisma");
const logger = require("@utils/logger");
const { createResponse } = require("@utils/responseHandler");
const {
  createCheckoutSession,
  createPortalSession,
  stripe,
} = require("@utils/stripe");

/**
 * Create a checkout session for subscription
 */
exports.createCheckoutSession = async (req) => {
  const { organizationId } = req.body;
  const { requestId, user } = req;

  if (!organizationId) {
    const err = new Error("Organization ID is required");
    err.status = 400;
    throw err;
  }

  logger.info({
    message: "Creating checkout session",
    organizationId,
    userId: user.id,
    requestId,
  });

  try {
    // Get organization and billing subscription
    const organization = await prisma.organization.findUnique({
      where: { id: parseInt(organizationId) },
      include: {
        billingSubscription: true,
      },
    });

    if (!organization) {
      const err = new Error("Organization not found");
      err.status = 404;
      throw err;
    }

    // Check if user is a member
    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: parseInt(organizationId),
          userId: user.id,
        },
      },
    });

    if (!member) {
      const err = new Error("Not a member of this organization");
      err.status = 403;
      throw err;
    }

    const billingSubscription = organization.billingSubscription;
    if (!billingSubscription) {
      const err = new Error(
        "Billing subscription not initialized. Please contact support."
      );
      err.status = 500;
      throw err;
    }

    // Check subscription status
    const { status, stripeSubscriptionId } = billingSubscription;
    
    // If already active or trialing with subscription in Stripe, redirect to portal instead
    if ((status === "active" || status === "trialing") && stripeSubscriptionId) {
      logger.info({
        message: "Subscription already exists, should use portal instead of checkout",
        organizationId,
        subscriptionStatus: status,
        stripeSubscriptionId,
        requestId,
      });
      
      const err = new Error(
        "Organization already has a subscription. Please use the billing portal to manage it."
      );
      err.status = 409;
      err.code = "SUBSCRIPTION_EXISTS";
      throw err;
    }

    // Create checkout session (only for new subscriptions or expired ones)
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const session = await createCheckoutSession({
      customerId: billingSubscription.stripeCustomerId,
      priceId: billingSubscription.stripePriceId,
      successUrl: `${frontendUrl}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${frontendUrl}/subscription-management?organizationId=${organizationId}`,
      trialPeriodDays: 0, // Don't add trial in checkout, subscription already has it
      metadata: {
        organizationId: organizationId.toString(),
        userId: user.id.toString(),
        stripeSubscriptionId: stripeSubscriptionId || undefined,
      },
    });

    logger.info({
      message: "Checkout session created successfully",
      sessionId: session.id,
      organizationId,
      requestId,
    });

    return createResponse(true, {
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    logger.error({
      message: "Error creating checkout session",
      organizationId,
      userId: user.id,
      requestId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Get subscription status for an organization
 */
exports.getSubscriptionStatus = async (req, organizationId) => {
  const { requestId } = req;

  logger.info({
    message: "Fetching subscription status",
    organizationId,
    requestId,
  });

  try {
    const billingSubscription = await prisma.billingSubscription.findUnique({
      where: { organizationId: parseInt(organizationId) },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!billingSubscription) {
      const err = new Error("Subscription not found");
      err.status = 404;
      throw err;
    }

    logger.info({
      message: "Subscription status fetched",
      organizationId,
      status: billingSubscription.status,
      requestId,
    });

    return createResponse(true, {
      id: billingSubscription.id,
      plan: billingSubscription.plan,
      status: billingSubscription.status,
      currentPeriodStart: billingSubscription.currentPeriodStart,
      currentPeriodEnd: billingSubscription.currentPeriodEnd,
      cancelAtPeriodEnd: billingSubscription.cancelAtPeriodEnd,
      trialStart: billingSubscription.trialStart,
      trialEnd: billingSubscription.trialEnd,
      organization: billingSubscription.organization,
    });
  } catch (error) {
    logger.error({
      message: "Error fetching subscription status",
      organizationId,
      requestId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Create customer portal session
 */
exports.createCustomerPortalSession = async (req) => {
  const { organizationId } = req.body;
  const { requestId } = req;

  if (!organizationId) {
    const err = new Error("Organization ID is required");
    err.status = 400;
    throw err;
  }

  logger.info({
    message: "Creating customer portal session",
    organizationId,
    requestId,
  });

  try {
    const billingSubscription = await prisma.billingSubscription.findUnique({
      where: { organizationId: parseInt(organizationId) },
    });

    if (!billingSubscription) {
      const err = new Error("Subscription not found");
      err.status = 404;
      throw err;
    }

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const session = await createPortalSession({
      customerId: billingSubscription.stripeCustomerId,
      returnUrl: `${frontendUrl}/subscription-management?organizationId=${organizationId}`,
    });

    logger.info({
      message: "Customer portal session created",
      sessionId: session.id,
      organizationId,
      requestId,
    });

    return createResponse(true, {
      url: session.url,
    });
  } catch (error) {
    logger.error({
      message: "Error creating customer portal session",
      organizationId,
      requestId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Finalize checkout session - sync Stripe data to DB immediately
 */
exports.finalizeCheckout = async (req) => {
  const { sessionId } = req.body;
  const { requestId, user } = req;

  if (!sessionId) {
    const err = new Error("Checkout session ID is required");
    err.status = 400;
    throw err;
  }

  logger.info({
    message: "Finalizing checkout session",
    sessionId,
    userId: user.id,
    requestId,
  });

  try {
    // Retrieve checkout session from Stripe with expanded data
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    });

    logger.info({
      message: "Checkout session retrieved",
      sessionId,
      subscriptionId: session.subscription?.id,
      customerId: session.customer?.id,
      status: session.status,
      paymentStatus: session.payment_status,
      requestId,
    });

    // Validate session is complete
    if (session.status !== 'complete') {
      const err = new Error("Checkout session is not complete");
      err.status = 400;
      throw err;
    }

    // Get subscription data
    const subscription = typeof session.subscription === 'string'
      ? await stripe.subscriptions.retrieve(session.subscription)
      : session.subscription;

    if (!subscription) {
      const err = new Error("No subscription found in checkout session");
      err.status = 404;
      throw err;
    }

    // Get organizationId from metadata
    const organizationId = subscription.metadata?.organizationId;
    if (!organizationId) {
      logger.warn({
        message: "No organizationId in subscription metadata",
        subscriptionId: subscription.id,
        metadata: subscription.metadata,
        requestId,
      });
      const err = new Error("No organization associated with this subscription");
      err.status = 400;
      throw err;
    }

    logger.info({
      message: "Syncing subscription to database",
      organizationId,
      subscriptionId: subscription.id,
      status: subscription.status,
      requestId,
    });

    // UPSERT billing subscription (idempotent)
    const billingSubscription = await prisma.billingSubscription.upsert({
      where: { 
        organizationId: parseInt(organizationId) 
      },
      update: {
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodStart: subscription.current_period_start
          ? new Date(subscription.current_period_start * 1000)
          : null,
        currentPeriodEnd: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : null,
        trialStart: subscription.trial_start
          ? new Date(subscription.trial_start * 1000)
          : null,
        trialEnd: subscription.trial_end
          ? new Date(subscription.trial_end * 1000)
          : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
      },
      create: {
        organizationId: parseInt(organizationId),
        stripeCustomerId: subscription.customer,
        stripeSubscriptionId: subscription.id,
        stripePriceId: subscription.items.data[0].price.id,
        plan: "startup",
        status: subscription.status,
        currentPeriodStart: subscription.current_period_start
          ? new Date(subscription.current_period_start * 1000)
          : null,
        currentPeriodEnd: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : null,
        trialStart: subscription.trial_start
          ? new Date(subscription.trial_start * 1000)
          : null,
        trialEnd: subscription.trial_end
          ? new Date(subscription.trial_end * 1000)
          : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
      },
    });

    logger.info({
      message: "Checkout finalized successfully",
      organizationId,
      subscriptionId: subscription.id,
      billingSubscriptionId: billingSubscription.id,
      status: subscription.status,
      requestId,
    });

    return createResponse(true, {
      organizationId: parseInt(organizationId),
      subscription: {
        id: billingSubscription.id,
        status: billingSubscription.status,
        plan: billingSubscription.plan,
        trialEnd: billingSubscription.trialEnd,
        currentPeriodEnd: billingSubscription.currentPeriodEnd,
      },
    });
  } catch (error) {
    logger.error({
      message: "Error finalizing checkout",
      sessionId,
      userId: user.id,
      requestId,
      error: error.message,
    });
    throw error;
  }
};

