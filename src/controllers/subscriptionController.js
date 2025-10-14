const prisma = require("@utils/prisma");
const logger = require("@utils/logger");
const { createResponse } = require("@utils/responseHandler");
const {
  createCheckoutSession,
  createPortalSession,
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

    // Check if subscription already exists and is active
    if (organization.billingSubscription) {
      const { status } = organization.billingSubscription;
      if (status === "active" || status === "trialing") {
        const err = new Error("Organization already has an active subscription");
        err.status = 409;
        throw err;
      }
    }

    const billingSubscription = organization.billingSubscription;
    if (!billingSubscription) {
      const err = new Error(
        "Billing subscription not initialized. Please contact support."
      );
      err.status = 500;
      throw err;
    }

    // Create checkout session
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const session = await createCheckoutSession({
      customerId: billingSubscription.stripeCustomerId,
      priceId: billingSubscription.stripePriceId,
      successUrl: `${frontendUrl}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${frontendUrl}/subscription-management?organizationId=${organizationId}`,
      trialPeriodDays: 7,
      metadata: {
        organizationId: organizationId.toString(),
        userId: user.id.toString(),
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

