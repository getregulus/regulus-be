const prisma = require("@utils/prisma");
const logger = require("@utils/logger");
const { verifyWebhookSignature } = require("@utils/stripe");

/**
 * Handle Stripe webhook events
 */
exports.handleStripeWebhook = async (req, res) => {
  const signature = req.headers["stripe-signature"];
  const { requestId } = req;

  try {
    // Verify webhook signature
    const event = verifyWebhookSignature(req.body, signature);

    logger.info({
      message: "Stripe webhook received",
      eventType: event.type,
      eventId: event.id,
      subscriptionId: event.data.object?.id || event.data.object?.subscription,
      customerId: event.data.object?.customer,
      organizationId: event.data.object?.metadata?.organizationId,
      requestId,
    });

    // Check if event was already processed (idempotency)
    const existingEvent = await prisma.webhookEvent.findUnique({
      where: { stripeEventId: event.id },
    });

    if (existingEvent) {
      logger.info({
        message: "Webhook event already processed (idempotent)",
        eventId: event.id,
        eventType: event.type,
        subscriptionId: event.data.object?.id || event.data.object?.subscription,
        organizationId: event.data.object?.metadata?.organizationId,
        processedAt: existingEvent.processedAt,
        requestId,
      });
      return res.json({ received: true, alreadyProcessed: true });
    }

    // Handle different event types
    switch (event.type) {
      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object, requestId);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object, requestId);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object, requestId);
        break;

      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(event.data.object, requestId);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object, requestId);
        break;

      default:
        logger.info({
          message: "Unhandled webhook event type",
          eventType: event.type,
          requestId,
        });
    }

    // Mark event as processed
    await prisma.webhookEvent.create({
      data: {
        stripeEventId: event.id,
        eventType: event.type,
      },
    });

    res.json({ received: true });
  } catch (error) {
    logger.error({
      message: "Webhook processing error",
      error: error.message,
      stack: error.stack,
      eventType: event?.type,
      eventId: event?.id,
      subscriptionId: event?.data?.object?.id || event?.data?.object?.subscription,
      organizationId: event?.data?.object?.metadata?.organizationId,
      requestId,
    });
    res.status(400).json({ error: error.message });
  }
};

/**
 * Handle subscription created event
 */
async function handleSubscriptionCreated(subscription, requestId) {
  const organizationId = subscription.metadata?.organizationId;

  if (!organizationId) {
    // Try to find by subscription ID (fallback)
    const billingSubscription = await prisma.billingSubscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!billingSubscription) {
      logger.warn({
        message: "Subscription created without organizationId metadata and not found in database",
        subscriptionId: subscription.id,
        requestId,
      });
      return;
    }

    logger.info({
      message: "Processing subscription created event (via stripeSubscriptionId)",
      subscriptionId: subscription.id,
      organizationId: billingSubscription.organizationId,
      requestId,
    });

    try {
      await prisma.billingSubscription.update({
        where: { id: billingSubscription.id },
        data: {
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          trialStart: subscription.trial_start
            ? new Date(subscription.trial_start * 1000)
            : null,
          trialEnd: subscription.trial_end
            ? new Date(subscription.trial_end * 1000)
            : null,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
      });

      logger.info({
        message: "Subscription created successfully (via fallback)",
        subscriptionId: subscription.id,
        organizationId: billingSubscription.organizationId,
        requestId,
      });
    } catch (error) {
      logger.error({
        message: "Error handling subscription created (fallback)",
        subscriptionId: subscription.id,
        organizationId: billingSubscription.organizationId,
        error: error.message,
        requestId,
      });
      throw error;
    }
    return;
  }

  logger.info({
    message: "Processing subscription created event",
    subscriptionId: subscription.id,
    organizationId,
    requestId,
  });

  try {
    await prisma.billingSubscription.update({
      where: { organizationId: parseInt(organizationId) },
      data: {
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        trialStart: subscription.trial_start
          ? new Date(subscription.trial_start * 1000)
          : null,
        trialEnd: subscription.trial_end
          ? new Date(subscription.trial_end * 1000)
          : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });

    logger.info({
      message: "Subscription created successfully",
      subscriptionId: subscription.id,
      organizationId,
      requestId,
    });
  } catch (error) {
    logger.error({
      message: "Error handling subscription created",
      subscriptionId: subscription.id,
      organizationId,
      error: error.message,
      requestId,
    });
    throw error;
  }
}

/**
 * Handle subscription updated event
 */
async function handleSubscriptionUpdated(subscription, requestId) {
  const organizationId = subscription.metadata?.organizationId;

  if (!organizationId) {
    // Try to find by subscription ID
    const billingSubscription = await prisma.billingSubscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!billingSubscription) {
      logger.warn({
        message: "Subscription updated but not found in database",
        subscriptionId: subscription.id,
        requestId,
      });
      return;
    }

    logger.info({
      message: "Processing subscription updated event",
      subscriptionId: subscription.id,
      organizationId: billingSubscription.organizationId,
      status: subscription.status,
      requestId,
    });

    await prisma.billingSubscription.update({
      where: { id: billingSubscription.id },
      data: {
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        trialStart: subscription.trial_start
          ? new Date(subscription.trial_start * 1000)
          : null,
        trialEnd: subscription.trial_end
          ? new Date(subscription.trial_end * 1000)
          : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });

    return;
  }

  logger.info({
    message: "Processing subscription updated event",
    subscriptionId: subscription.id,
    organizationId,
    status: subscription.status,
    requestId,
  });

  try {
    await prisma.billingSubscription.update({
      where: { organizationId: parseInt(organizationId) },
      data: {
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        trialStart: subscription.trial_start
          ? new Date(subscription.trial_start * 1000)
          : null,
        trialEnd: subscription.trial_end
          ? new Date(subscription.trial_end * 1000)
          : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });

    logger.info({
      message: "Subscription updated successfully",
      subscriptionId: subscription.id,
      organizationId,
      status: subscription.status,
      requestId,
    });
  } catch (error) {
    logger.error({
      message: "Error handling subscription updated",
      subscriptionId: subscription.id,
      organizationId,
      error: error.message,
      requestId,
    });
    throw error;
  }
}

/**
 * Handle subscription deleted event
 */
async function handleSubscriptionDeleted(subscription, requestId) {
  const organizationId = subscription.metadata?.organizationId;

  if (!organizationId) {
    // Try to find by subscription ID
    const billingSubscription = await prisma.billingSubscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!billingSubscription) {
      logger.warn({
        message: "Subscription deleted but not found in database",
        subscriptionId: subscription.id,
        requestId,
      });
      return;
    }

    logger.info({
      message: "Processing subscription deleted event",
      subscriptionId: subscription.id,
      organizationId: billingSubscription.organizationId,
      requestId,
    });

    await prisma.billingSubscription.update({
      where: { id: billingSubscription.id },
      data: {
        status: "canceled",
        cancelAtPeriodEnd: false,
      },
    });

    return;
  }

  logger.info({
    message: "Processing subscription deleted event",
    subscriptionId: subscription.id,
    organizationId,
    requestId,
  });

  try {
    await prisma.billingSubscription.update({
      where: { organizationId: parseInt(organizationId) },
      data: {
        status: "canceled",
        cancelAtPeriodEnd: false,
      },
    });

    logger.info({
      message: "Subscription deleted successfully",
      subscriptionId: subscription.id,
      organizationId,
      requestId,
    });
  } catch (error) {
    logger.error({
      message: "Error handling subscription deleted",
      subscriptionId: subscription.id,
      organizationId,
      error: error.message,
      requestId,
    });
    throw error;
  }
}

/**
 * Handle payment succeeded event
 */
async function handlePaymentSucceeded(invoice, requestId) {
  const subscriptionId = invoice.subscription;

  if (!subscriptionId) {
    logger.info({
      message: "Payment succeeded for non-subscription invoice",
      invoiceId: invoice.id,
      requestId,
    });
    return;
  }

  logger.info({
    message: "Processing payment succeeded event",
    invoiceId: invoice.id,
    subscriptionId,
    requestId,
  });

  try {
    const billingSubscription = await prisma.billingSubscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (!billingSubscription) {
      logger.warn({
        message: "Subscription not found for successful payment",
        subscriptionId,
        invoiceId: invoice.id,
        requestId,
      });
      return;
    }

    // Update status to active if it was past_due or incomplete
    if (
      billingSubscription.status === "past_due" ||
      billingSubscription.status === "incomplete"
    ) {
      await prisma.billingSubscription.update({
        where: { id: billingSubscription.id },
        data: {
          status: "active",
        },
      });

      logger.info({
        message: "Subscription reactivated after successful payment",
        subscriptionId,
        organizationId: billingSubscription.organizationId,
        requestId,
      });
    }
  } catch (error) {
    logger.error({
      message: "Error handling payment succeeded",
      invoiceId: invoice.id,
      subscriptionId,
      organizationId: billingSubscription?.organizationId,
      error: error.message,
      stack: error.stack,
      requestId,
    });
    throw error;
  }
}

/**
 * Handle payment failed event
 */
async function handlePaymentFailed(invoice, requestId) {
  const subscriptionId = invoice.subscription;

  if (!subscriptionId) {
    logger.info({
      message: "Payment failed for non-subscription invoice",
      invoiceId: invoice.id,
      requestId,
    });
    return;
  }

  logger.info({
    message: "Processing payment failed event",
    invoiceId: invoice.id,
    subscriptionId,
    requestId,
  });

  try {
    const billingSubscription = await prisma.billingSubscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (!billingSubscription) {
      logger.warn({
        message: "Subscription not found for failed payment",
        subscriptionId,
        invoiceId: invoice.id,
        requestId,
      });
      return;
    }

    // Update status to past_due
    await prisma.billingSubscription.update({
      where: { id: billingSubscription.id },
      data: {
        status: "past_due",
      },
    });

    logger.info({
      message: "Subscription marked as past_due after failed payment",
      subscriptionId,
      organizationId: billingSubscription.organizationId,
      requestId,
    });

    // TODO: Send notification to organization admins about failed payment
  } catch (error) {
    logger.error({
      message: "Error handling payment failed",
      invoiceId: invoice.id,
      subscriptionId,
      organizationId: billingSubscription?.organizationId,
      error: error.message,
      stack: error.stack,
      requestId,
    });
    throw error;
  }
}

