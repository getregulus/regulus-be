const prisma = require("@utils/prisma");
const logger = require("@utils/logger");

/**
 * Middleware to check if organization has an active subscription
 * Allows read operations (GET) for all users
 * Blocks write operations (POST, PUT, DELETE, PATCH) if subscription is not active
 */
async function checkSubscription(req, res, next) {
  try {
    // Allow GET requests (read operations) regardless of subscription status
    if (req.method === "GET") {
      return next();
    }

    // Get organization from request (set by organizationContext middleware)
    const organizationId = req.organization?.id;

    if (!organizationId) {
      logger.warn({
        message: "Subscription check: No organization context found",
        path: req.path,
        method: req.method,
        requestId: req.requestId,
      });
      return res.status(400).json({
        success: false,
        message: "Organization context required",
      });
    }

    logger.info({
      message: "Checking subscription status",
      organizationId,
      method: req.method,
      path: req.path,
      requestId: req.requestId,
    });

    // Fetch billing subscription
    const billingSubscription = await prisma.billingSubscription.findUnique({
      where: { organizationId },
    });

    if (!billingSubscription) {
      logger.warn({
        message: "No billing subscription found for organization",
        organizationId,
        requestId: req.requestId,
      });
      return res.status(403).json({
        success: false,
        message: "No subscription found. Please subscribe to continue.",
        code: "SUBSCRIPTION_REQUIRED",
      });
    }

    // Check if subscription is in an active state
    const activeStatuses = ["trialing", "active"];
    const isActive = activeStatuses.includes(billingSubscription.status);

    if (!isActive) {
      logger.warn({
        message: "Subscription not active for write operation",
        organizationId,
        status: billingSubscription.status,
        method: req.method,
        path: req.path,
        requestId: req.requestId,
      });

      return res.status(403).json({
        success: false,
        message: `Subscription is ${billingSubscription.status}. Please update your subscription to continue.`,
        code: "SUBSCRIPTION_INACTIVE",
        subscription: {
          status: billingSubscription.status,
          plan: billingSubscription.plan,
        },
      });
    }

    // Add subscription to request context
    req.billingSubscription = billingSubscription;

    logger.info({
      message: "Subscription check passed",
      organizationId,
      status: billingSubscription.status,
      requestId: req.requestId,
    });

    next();
  } catch (error) {
    logger.error({
      message: "Error checking subscription",
      organizationId: req.organization?.id,
      error: error.message,
      requestId: req.requestId,
    });
    next(error);
  }
}

module.exports = {
  checkSubscription,
};

