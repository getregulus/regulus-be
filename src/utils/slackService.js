const { WebClient } = require("@slack/web-api");
const logger = require("@utils/logger");

/**
 * Slack Service
 * Handles Slack OAuth, channel listing, and message sending
 */

/**
 * Exchange OAuth code for access token
 * @param {string} code - OAuth authorization code from Slack
 * @returns {Promise<Object>} Token response with access token and team info
 */
const exchangeCodeForToken = async (code) => {
  try {
    const client = new WebClient();
    
    const result = await client.oauth.v2.access({
      client_id: process.env.SLACK_CLIENT_ID,
      client_secret: process.env.SLACK_CLIENT_SECRET,
      code,
    });

    logger.info({
      message: "Successfully exchanged Slack OAuth code",
      teamId: result.team?.id,
      teamName: result.team?.name,
    });

    return {
      accessToken: result.access_token,
      tokenType: result.token_type,
      scope: result.scope,
      botUserId: result.bot_user_id,
      appId: result.app_id,
      team: {
        id: result.team.id,
        name: result.team.name,
      },
      authedUser: {
        id: result.authed_user.id,
      },
      incomingWebhook: result.incoming_webhook,
    };
  } catch (error) {
    logger.error({
      message: "Failed to exchange Slack OAuth code",
      error: error.message,
      data: error.data,
    });
    throw new Error(`Slack OAuth error: ${error.message}`);
  }
};

/**
 * Get list of channels in a Slack workspace
 * @param {string} accessToken - Slack bot access token
 * @returns {Promise<Array>} List of channels
 */
const listChannels = async (accessToken) => {
  try {
    const client = new WebClient(accessToken);
    const channels = [];

    // Get public channels
    let cursor;
    do {
      const result = await client.conversations.list({
        types: "public_channel,private_channel",
        exclude_archived: true,
        limit: 200,
        cursor,
      });

      channels.push(
        ...result.channels.map((channel) => ({
          id: channel.id,
          name: channel.name,
          isPrivate: channel.is_private,
          isMember: channel.is_member,
        }))
      );

      cursor = result.response_metadata?.next_cursor;
    } while (cursor);

    logger.info({
      message: "Successfully fetched Slack channels",
      count: channels.length,
    });

    return channels;
  } catch (error) {
    logger.error({
      message: "Failed to fetch Slack channels",
      error: error.message,
      data: error.data,
    });
    throw new Error(`Failed to fetch Slack channels: ${error.message}`);
  }
};

/**
 * Send a message to a Slack channel
 * @param {string} accessToken - Slack bot access token
 * @param {string} channelId - Slack channel ID
 * @param {string} text - Message text
 * @param {Array} blocks - Optional Slack blocks for rich formatting
 * @returns {Promise<Object>} Message response
 */
const sendMessage = async (accessToken, channelId, text, blocks = null) => {
  try {
    const client = new WebClient(accessToken);

    const messagePayload = {
      channel: channelId,
      text,
    };

    // Add blocks if provided for rich formatting
    if (blocks) {
      messagePayload.blocks = blocks;
    }

    const result = await client.chat.postMessage(messagePayload);

    logger.info({
      message: "Successfully sent Slack message",
      channelId,
      messageTs: result.ts,
    });

    return {
      ok: result.ok,
      channel: result.channel,
      ts: result.ts,
      message: result.message,
    };
  } catch (error) {
    logger.error({
      message: "Failed to send Slack message",
      channelId,
      error: error.message,
      data: error.data,
    });
    throw new Error(`Failed to send Slack message: ${error.message}`);
  }
};

/**
 * Format alert message for Slack with rich blocks
 * @param {Object} alert - Alert object
 * @param {Object} transaction - Transaction object
 * @param {string} ruleName - Rule name that triggered the alert
 * @returns {Object} Formatted Slack message with blocks
 */
const formatAlertMessage = (alert, transaction, ruleName) => {
  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "🚨 Transaction Alert",
        emoji: true,
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Rule:*\n${ruleName}`,
        },
        {
          type: "mrkdwn",
          text: `*Transaction ID:*\n${transaction.transaction_id}`,
        },
        {
          type: "mrkdwn",
          text: `*Amount:*\n${transaction.currency} ${transaction.amount.toFixed(2)}`,
        },
        {
          type: "mrkdwn",
          text: `*Country:*\n${transaction.country}`,
        },
        {
          type: "mrkdwn",
          text: `*User ID:*\n${transaction.user_id}`,
        },
        {
          type: "mrkdwn",
          text: `*Time:*\n${new Date(transaction.timestamp).toLocaleString()}`,
        },
      ],
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Reason:*\n${alert.reason}`,
      },
    },
    {
      type: "divider",
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Flagged at: ${new Date(alert.flagged_at).toLocaleString()}`,
        },
      ],
    },
  ];

  const fallbackText = `🚨 Transaction Alert: ${ruleName} - ${transaction.transaction_id} - ${transaction.currency} ${transaction.amount}`;

  return {
    text: fallbackText,
    blocks,
  };
};

/**
 * Test Slack connection
 * @param {string} accessToken - Slack bot access token
 * @returns {Promise<Object>} Auth test response
 */
const testConnection = async (accessToken) => {
  try {
    const client = new WebClient(accessToken);
    const result = await client.auth.test();

    logger.info({
      message: "Slack connection test successful",
      team: result.team,
      user: result.user,
    });

    return {
      ok: result.ok,
      url: result.url,
      team: result.team,
      user: result.user,
      teamId: result.team_id,
      userId: result.user_id,
    };
  } catch (error) {
    logger.error({
      message: "Slack connection test failed",
      error: error.message,
    });
    throw new Error(`Slack connection test failed: ${error.message}`);
  }
};

module.exports = {
  exchangeCodeForToken,
  listChannels,
  sendMessage,
  formatAlertMessage,
  testConnection,
};

