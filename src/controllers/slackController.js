const prisma = require("@utils/prisma");
const logger = require("@utils/logger");
const { createResponse } = require("@utils/responseHandler");
const { logAudit } = require("@utils/auditLogger");
const Joi = require("joi");
const { ValidationError } = require("joi");
const { v4: uuidv4 } = require("uuid");
const slackService = require("@utils/slackService");

/**
 * Initiate Slack OAuth flow
 * Returns the authorization URL where user should be redirected
 */
const initiateSlackOAuth = async (req) => {
  const { organization, requestId } = req;

  try {
    logger.info({
      message: "Initiating Slack OAuth",
      organizationId: organization.id,
      requestId,
    });

    const clientId = process.env.SLACK_CLIENT_ID;
    const redirectUri = process.env.SLACK_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      throw new Error("Slack OAuth not configured. Missing client ID or redirect URI.");
    }

    // Generate state parameter for CSRF protection
    const state = uuidv4();

    // Store state in a temporary session or cache (for production, use Redis or similar)
    // For now, we'll include organizationId in the state
    const stateData = Buffer.from(
      JSON.stringify({
        organizationId: organization.id,
        nonce: state,
      })
    ).toString("base64");

    const scopes = [
      "chat:write",
      "chat:write.public",
      "channels:read",
      "groups:read",
    ].join(",");

    const authUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&state=${stateData}`;

    logger.info({
      message: "Slack OAuth URL generated",
      organizationId: organization.id,
      requestId,
    });

    return createResponse(true, {
      authorizationUrl: authUrl,
      state: stateData,
    });
  } catch (error) {
    logger.error({
      message: "Error initiating Slack OAuth",
      organizationId: organization.id,
      requestId,
      error,
    });
    throw error;
  }
};

/**
 * Handle Slack OAuth callback
 * Exchanges code for access token and creates/updates channel
 */
const handleSlackCallback = async (code, state) => {
  try {
    logger.info({
      message: "Handling Slack OAuth callback",
      hasCode: !!code,
      hasState: !!state,
    });

    // Decode and verify state
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, "base64").toString());
    } catch (err) {
      throw new Error("Invalid state parameter");
    }

    const { organizationId } = stateData;

    if (!organizationId) {
      throw new Error("Invalid state: missing organization ID");
    }

    // Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new Error("Organization not found");
    }

    // Exchange code for access token
    const tokenData = await slackService.exchangeCodeForToken(code);

    // Test the connection
    await slackService.testConnection(tokenData.accessToken);

    // Check if channel already exists for this organization
    const existingChannel = await prisma.channel.findFirst({
      where: {
        organizationId,
        channelType: "slack",
      },
    });

    let channel;
    const channelConfig = {
      accessToken: tokenData.accessToken,
      teamId: tokenData.team.id,
      teamName: tokenData.team.name,
      botUserId: tokenData.botUserId,
      scope: tokenData.scope,
    };

    if (existingChannel) {
      // Update existing channel
      channel = await prisma.channel.update({
        where: { id: existingChannel.id },
        data: {
          name: `Slack - ${tokenData.team.name}`,
          config: channelConfig,
          status: "active",
          updatedAt: new Date(),
        },
      });

      logger.info({
        message: "Updated existing Slack channel",
        channelId: channel.id,
        organizationId,
      });
    } else {
      // Create new channel
      channel = await prisma.channel.create({
        data: {
          channelId: uuidv4(),
          channelType: "slack",
          name: `Slack - ${tokenData.team.name}`,
          config: channelConfig,
          status: "active",
          organizationId,
        },
      });

      logger.info({
        message: "Created new Slack channel",
        channelId: channel.id,
        organizationId,
      });
    }

    return createResponse(true, {
      channelId: channel.id,
      teamName: tokenData.team.name,
      message: "Slack workspace connected successfully",
    });
  } catch (error) {
    logger.error({
      message: "Error handling Slack OAuth callback",
      error: error.message,
    });
    throw error;
  }
};

/**
 * Get available Slack channels for an organization
 * Returns list of channels from the connected Slack workspace
 */
const getSlackChannels = async (req) => {
  const { organization, requestId } = req;

  try {
    logger.info({
      message: "Fetching Slack channels",
      organizationId: organization.id,
      requestId,
    });

    // Get the Slack channel configuration
    const channel = await prisma.channel.findFirst({
      where: {
        organizationId: organization.id,
        channelType: "slack",
        status: "active",
      },
    });

    if (!channel) {
      const err = new Error("Slack not connected. Please connect your Slack workspace first.");
      err.name = "NotFoundError";
      throw err;
    }

    const { accessToken } = channel.config;

    if (!accessToken) {
      const err = new Error("Slack access token not found. Please reconnect your Slack workspace.");
      err.name = "ValidationError";
      throw err;
    }

    // Fetch channels from Slack
    const slackChannels = await slackService.listChannels(accessToken);

    logger.info({
      message: "Fetched Slack channels",
      count: slackChannels.length,
      organizationId: organization.id,
      requestId,
    });

    return createResponse(true, {
      channels: slackChannels,
      teamName: channel.config.teamName,
    });
  } catch (error) {
    logger.error({
      message: "Error fetching Slack channels",
      organizationId: organization.id,
      requestId,
      error,
    });
    throw error;
  }
};

/**
 * Update selected Slack channel for notifications
 * Saves the channel ID where alerts should be sent
 */
const updateSlackChannel = async (req) => {
  const { organization, body, requestId } = req;
  const { channelId, channelName } = body;

  // Validate input
  const schema = Joi.object({
    channelId: Joi.string().required(),
    channelName: Joi.string().required(),
  });

  const { error } = schema.validate(body);
  if (error) {
    const errorMessage = error.details.map((d) => d.message).join(", ");
    logger.warn({
      message: "Validation failed for Slack channel update",
      errors: errorMessage,
      requestId,
    });
    throw new ValidationError(errorMessage);
  }

  try {
    logger.info({
      message: "Updating Slack channel selection",
      channelId,
      channelName,
      organizationId: organization.id,
      requestId,
    });

    // Get the Slack channel configuration
    const channel = await prisma.channel.findFirst({
      where: {
        organizationId: organization.id,
        channelType: "slack",
        status: "active",
      },
    });

    if (!channel) {
      const err = new Error("Slack not connected");
      err.name = "NotFoundError";
      throw err;
    }

    // Update config with selected channel
    const updatedConfig = {
      ...channel.config,
      selectedChannel: channelId,
      selectedChannelName: channelName,
    };

    const updatedChannel = await prisma.channel.update({
      where: { id: channel.id },
      data: {
        config: updatedConfig,
        updatedAt: new Date(),
      },
    });

    logger.info({
      message: "Slack channel selection updated",
      channelId: updatedChannel.id,
      slackChannelId: channelId,
      organizationId: organization.id,
      requestId,
    });

    // Log audit
    await logAudit(req, {
      action: `Updated Slack notification channel to: ${channelName}`,
    });

    return createResponse(true, {
      channelId: updatedChannel.id,
      selectedChannel: channelId,
      selectedChannelName: channelName,
      message: "Slack channel updated successfully",
    });
  } catch (error) {
    logger.error({
      message: "Error updating Slack channel selection",
      organizationId: organization.id,
      requestId,
      error,
    });
    throw error;
  }
};

/**
 * Disconnect Slack integration
 * Deactivates the Slack channel
 */
const disconnectSlack = async (req) => {
  const { organization, requestId } = req;

  try {
    logger.info({
      message: "Disconnecting Slack",
      organizationId: organization.id,
      requestId,
    });

    const channel = await prisma.channel.findFirst({
      where: {
        organizationId: organization.id,
        channelType: "slack",
      },
    });

    if (!channel) {
      const err = new Error("Slack channel not found");
      err.name = "NotFoundError";
      throw err;
    }

    await prisma.channel.update({
      where: { id: channel.id },
      data: {
        status: "inactive",
        updatedAt: new Date(),
      },
    });

    logger.info({
      message: "Slack disconnected successfully",
      channelId: channel.id,
      organizationId: organization.id,
      requestId,
    });

    // Log audit
    await logAudit(req, {
      action: "Disconnected Slack workspace",
    });

    return createResponse(true, {
      message: "Slack disconnected successfully",
    });
  } catch (error) {
    logger.error({
      message: "Error disconnecting Slack",
      organizationId: organization.id,
      requestId,
      error,
    });
    throw error;
  }
};

module.exports = {
  initiateSlackOAuth,
  handleSlackCallback,
  getSlackChannels,
  updateSlackChannel,
  disconnectSlack,
};

