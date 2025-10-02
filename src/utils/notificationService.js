const prisma = require("@utils/prisma");
const slackService = require("@utils/slackService");
const logger = require("@utils/logger");

/**
 * Notification Service
 * Handles sending notifications to various channels (Slack, Email, etc.)
 * when alerts are triggered
 */

/**
 * Send alert notification to all subscribed channels
 * @param {Object} alert - Alert object
 * @param {Object} transaction - Transaction object
 * @param {Object} rule - Rule that triggered the alert
 * @param {number} organizationId - Organization ID
 */
const sendAlertNotifications = async (alert, transaction, rule, organizationId) => {
  try {
    logger.info({
      message: "Sending alert notifications",
      alertId: alert.id,
      ruleId: rule.id,
      organizationId,
    });

    // Get all active channels for this organization that are subscribed to this rule
    const channels = await prisma.channel.findMany({
      where: {
        organizationId,
        status: "active",
        subscriptions: {
          some: {
            ruleId: rule.id,
            enabled: true,
          },
        },
      },
      include: {
        subscriptions: {
          where: {
            ruleId: rule.id,
            enabled: true,
          },
        },
      },
    });

    if (channels.length === 0) {
      logger.info({
        message: "No active channel subscriptions for this rule",
        ruleId: rule.id,
        organizationId,
      });
      return;
    }

    // Send to each channel
    const notifications = channels.map((channel) =>
      sendToChannel(channel, alert, transaction, rule)
    );

    await Promise.allSettled(notifications);

    logger.info({
      message: "Alert notifications sent",
      alertId: alert.id,
      channelCount: channels.length,
      organizationId,
    });
  } catch (error) {
    logger.error({
      message: "Error sending alert notifications",
      alertId: alert.id,
      organizationId,
      error: error.message,
    });
    // Don't throw - we don't want to fail the alert creation if notifications fail
  }
};

/**
 * Send notification to a specific channel
 * @param {Object} channel - Channel configuration
 * @param {Object} alert - Alert object
 * @param {Object} transaction - Transaction object
 * @param {Object} rule - Rule object
 */
const sendToChannel = async (channel, alert, transaction, rule) => {
  try {
    switch (channel.channelType) {
      case "slack":
        await sendSlackNotification(channel, alert, transaction, rule);
        break;

      case "email":
        // TODO: Implement email notifications
        logger.info({
          message: "Email notifications not yet implemented",
          channelId: channel.id,
        });
        break;

      case "webhook":
        // TODO: Implement webhook notifications
        logger.info({
          message: "Webhook notifications not yet implemented",
          channelId: channel.id,
        });
        break;

      default:
        logger.warn({
          message: "Unknown channel type",
          channelType: channel.channelType,
          channelId: channel.id,
        });
    }
  } catch (error) {
    logger.error({
      message: "Error sending to channel",
      channelId: channel.id,
      channelType: channel.channelType,
      error: error.message,
    });
  }
};

/**
 * Send Slack notification
 * @param {Object} channel - Slack channel configuration
 * @param {Object} alert - Alert object
 * @param {Object} transaction - Transaction object
 * @param {Object} rule - Rule object
 */
const sendSlackNotification = async (channel, alert, transaction, rule) => {
  try {
    const { accessToken, selectedChannel } = channel.config || {};

    if (!accessToken) {
      logger.error({
        message: "Slack access token not found",
        channelId: channel.id,
      });
      return;
    }

    if (!selectedChannel) {
      logger.error({
        message: "Slack channel not selected",
        channelId: channel.id,
      });
      return;
    }

    // Format and send message
    const message = slackService.formatAlertMessage(
      alert,
      transaction,
      rule.rule_name
    );

    await slackService.sendMessage(
      accessToken,
      selectedChannel,
      message.text,
      message.blocks
    );

    logger.info({
      message: "Slack notification sent successfully",
      channelId: channel.id,
      slackChannel: selectedChannel,
      alertId: alert.id,
    });
  } catch (error) {
    logger.error({
      message: "Failed to send Slack notification",
      channelId: channel.id,
      alertId: alert.id,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Send a test notification to verify channel configuration
 * @param {number} channelId - Database channel ID
 * @param {number} organizationId - Organization ID
 * @returns {Promise<Object>} Result of the test
 */
const sendTestNotification = async (channelId, organizationId) => {
  try {
    logger.info({
      message: "Sending test notification",
      channelId,
      organizationId,
    });

    const channel = await prisma.channel.findFirst({
      where: {
        id: channelId,
        organizationId,
      },
    });

    if (!channel) {
      throw new Error("Channel not found");
    }

    const testAlert = {
      id: 0,
      reason: "This is a test alert to verify your integration is working correctly.",
      flagged_at: new Date(),
    };

    const testTransaction = {
      transaction_id: "TEST-" + Date.now(),
      amount: 1000.0,
      currency: "USD",
      country: "US",
      user_id: "test-user",
      timestamp: new Date(),
    };

    const testRule = {
      id: 0,
      rule_name: "Test Rule",
    };

    await sendToChannel(channel, testAlert, testTransaction, testRule);

    logger.info({
      message: "Test notification sent successfully",
      channelId,
      organizationId,
    });

    return {
      success: true,
      message: "Test notification sent successfully",
    };
  } catch (error) {
    logger.error({
      message: "Failed to send test notification",
      channelId,
      organizationId,
      error: error.message,
    });
    throw error;
  }
};

module.exports = {
  sendAlertNotifications,
  sendTestNotification,
};

