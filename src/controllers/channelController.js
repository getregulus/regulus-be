const prisma = require("@utils/prisma");
const logger = require("@utils/logger");
const { createResponse } = require("@utils/responseHandler");
const { logAudit } = require("@utils/auditLogger");
const Joi = require("joi");
const { ValidationError } = require("joi");

const updateChannelSchema = Joi.object({
  name: Joi.string().min(3).max(100),
  config: Joi.object(),
  status: Joi.string().valid("active", "inactive"),
}).min(1);

const subscriptionsSchema = Joi.object({
  subscriptions: Joi.array()
    .items(
      Joi.object({
        ruleId: Joi.number().integer().required(),
        enabled: Joi.boolean().required(),
      })
    )
    .required(),
});

/**
 * Get channel by type for an organization
 * Returns channel configuration with subscriptions for a specific type (slack, telegram, email)
 */
const getChannelByType = async (req) => {
  const { organization, requestId, params } = req;
  const { channelType } = params;

  try {
    logger.info({
      message: "Fetching channel by type",
      channelType,
      organizationId: organization.id,
      requestId,
    });

    const channel = await prisma.channel.findFirst({
      where: {
        organizationId: organization.id,
        channelType,
      },
      include: {
        subscriptions: {
          where: {
            enabled: true,
          },
          include: {
            rule: {
              select: {
                id: true,
                rule_name: true,
              },
            },
          },
        },
      },
    });

    if (!channel) {
      const err = new Error(`${channelType} channel not configured`);
      err.name = "NotFoundError";
      throw err;
    }

    // Format response
    const formattedChannel = {
      ...channel,
      subscriptions: channel.subscriptions.map((sub) => ({
        ruleId: sub.ruleId,
        enabled: sub.enabled,
        ruleName: sub.rule.rule_name,
      })),
    };

    logger.info({
      message: `Fetched ${channelType} channel`,
      organizationId: organization.id,
      requestId,
    });

    return createResponse(true, formattedChannel);
  } catch (error) {
    logger.error({
      message: "Error fetching channel",
      channelType,
      organizationId: organization.id,
      requestId,
      error,
    });
    throw error;
  }
};

/**
 * Update an existing channel
 * Allows updating name, config, and status
 */
const updateChannel = async (req, id) => {
  const { organization, body, requestId } = req;

  // Validate request body
  const { error, value } = updateChannelSchema.validate(body);
  if (error) {
    const errorMessage = error.details.map((d) => d.message).join(", ");
    logger.warn({
      message: "Validation failed for channel update",
      errors: errorMessage,
      requestBody: body,
      requestId,
    });
    throw new ValidationError(errorMessage);
  }

  try {
    logger.info({
      message: "Updating channel",
      channelId: id,
      requestBody: body,
      requestId,
    });

    const data = {};
    if (value.name) data.name = value.name;
    if (value.config) data.config = value.config;
    if (value.status) data.status = value.status;

    const updatedChannel = await prisma.channel.update({
      where: {
        id: parseInt(id),
        organizationId: organization.id,
      },
      data,
      include: {
        subscriptions: {
          where: {
            enabled: true,
          },
          include: {
            rule: {
              select: {
                id: true,
                rule_name: true,
              },
            },
          },
        },
      },
    });

    logger.info({
      message: "Channel updated successfully",
      channelId: id,
      requestId,
    });

    // Log the action
    await logAudit(req, {
      action: `Updated channel: ${value.name || id}`,
    });

    return createResponse(true, updatedChannel);
  } catch (error) {
    logger.error({
      message: "Error updating channel",
      channelId: id,
      organizationId: organization.id,
      requestId,
      error,
    });
    throw error;
  }
};

/**
 * Update subscriptions for a channel by type
 * Replaces existing subscriptions with new ones
 */
const updateChannelSubscriptions = async (req) => {
  const { organization, body, requestId, params } = req;
  const { channelType } = params;

  // Validate request body
  const { error, value } = subscriptionsSchema.validate(body);
  if (error) {
    const errorMessage = error.details.map((d) => d.message).join(", ");
    logger.warn({
      message: "Validation failed for subscriptions update",
      errors: errorMessage,
      requestBody: body,
      requestId,
    });
    throw new ValidationError(errorMessage);
  }

  try {
    logger.info({
      message: "Updating channel subscriptions",
      channelType,
      subscriptionsCount: value.subscriptions.length,
      requestId,
    });

    // Verify channel exists and belongs to organization
    const channel = await prisma.channel.findFirst({
      where: {
        channelType,
        organizationId: organization.id,
      },
    });

    if (!channel) {
      const err = new Error(`${channelType} channel not configured`);
      err.name = "NotFoundError";
      throw err;
    }

    // Verify all rules exist and belong to organization
    const ruleIds = value.subscriptions.map((sub) => sub.ruleId);
    const rules = await prisma.rule.findMany({
      where: {
        id: { in: ruleIds },
        organizationId: organization.id,
      },
    });

    if (rules.length !== ruleIds.length) {
      const err = new Error("One or more rules not found");
      err.name = "ValidationError";
      throw err;
    }

    // Delete existing subscriptions and create new ones
    await prisma.$transaction(async (tx) => {
      // Delete all existing subscriptions for this channel
      await tx.subscription.deleteMany({
        where: { channelId: channel.id },
      });

      // Create new subscriptions
      await tx.subscription.createMany({
        data: value.subscriptions.map((sub) => ({
          channelId: channel.id,
          ruleId: sub.ruleId,
          enabled: sub.enabled,
        })),
      });
    });

    // Fetch updated channel with subscriptions
    const updatedChannel = await prisma.channel.findUnique({
      where: { id: channel.id },
      include: {
        subscriptions: {
          where: {
            enabled: true,
          },
          include: {
            rule: {
              select: {
                id: true,
                rule_name: true,
              },
            },
          },
        },
      },
    });

    logger.info({
      message: "Channel subscriptions updated successfully",
      channelType,
      channelId: channel.id,
      requestId,
    });

    // Log the action
    await logAudit(req, {
      action: `Updated subscriptions for channel: ${channel.name}`,
    });

    // Format response
    const formattedSubscriptions = updatedChannel.subscriptions.map((sub) => ({
      ruleId: sub.ruleId,
      enabled: sub.enabled,
      ruleName: sub.rule.rule_name,
    }));

    return createResponse(true, {
      channelId: updatedChannel.channelId,
      channelType: updatedChannel.channelType,
      subscriptions: formattedSubscriptions,
    });
  } catch (error) {
    logger.error({
      message: "Error updating channel subscriptions",
      channelType,
      organizationId: organization.id,
      requestId,
      error,
    });
    throw error;
  }
};

module.exports = {
  getChannelByType,
  updateChannel,
  updateChannelSubscriptions,
};

