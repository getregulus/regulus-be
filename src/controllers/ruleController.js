const prisma = require("@utils/prisma");
const logger = require("@utils/logger");
const { createResponse } = require("@utils/responseHandler");
const { logAudit } = require("@utils/auditLogger");
const Joi = require("joi");
const { ValidationError } = require("joi");

const ruleSchema = Joi.object({
  rule_name: Joi.string().required(),
  field: Joi.string()
    .valid("amount", "currency", "country", "user_id", "transaction_id")
    .required(),
  operator: Joi.string()
    .valid(
      "GREATER_THAN",
      "LESS_THAN",
      "GREATER_THAN_OR_EQUAL",
      "LESS_THAN_OR_EQUAL",
      "EQUAL",
      "NOT_EQUAL",
      "IN"
    )
    .required(),
  value: Joi.string().required(),
});

// Create a new rule
const createRule = async (req) => {
  const { organization, body, requestId } = req;

  const { error, value } = ruleSchema.validate(body);
  if (error) {
    const errorMessage = error.details.map((d) => d.message).join(", ");
    logger.warn({
      message: "Validation failed for rule creation",
      errors: errorMessage,
      requestBody: body,
      requestId,
    });
    throw new ValidationError(errorMessage);
  }

  const rule = await prisma.rule.create({
    data: {
      rule_name: value.rule_name,
      field: value.field,
      operator: value.operator,
      value: value.value,
      organizationId: organization.id,
    },
  });

  logger.info({
    message: "Rule created successfully",
    ruleId: rule.id,
    requestId,
  });

  return createResponse(true, rule);
};

// Get all rules for an organization with pagination
async function getRules(req) {
  const { organization, requestId } = req;

  // Parse and validate pagination parameters with defaults and max limit
  const MAX_LIMIT = 100;
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 25, 1), MAX_LIMIT);
  const offset = (page - 1) * limit;

  try {
    logger.info({
      message: "Fetching rules",
      organizationId: organization.id,
      page,
      limit,
      requestId,
    });

    // Get total count for pagination metadata
    const total = await prisma.rule.count({
      where: { organizationId: organization.id },
    });

    // Fetch paginated rules
    const rules = await prisma.rule.findMany({
      where: { organizationId: organization.id },
      include: {
        subscriptions: {
          where: {
            enabled: true,
          },
          include: {
            channel: {
              select: {
                id: true,
                channelId: true,
                name: true,
                channelType: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    logger.info({
      message: `Fetched ${rules.length} rules (page ${page}/${totalPages})`,
      organizationId: organization.id,
      requestId,
    });

    return {
      success: true,
      page,
      limit,
      total,
      totalPages,
      data: rules,
    };
  } catch (error) {
    logger.error({
      message: "Error fetching rules",
      organizationId: organization.id,
      requestId,
      error,
    });
    throw error;
  }
}

// Update an existing rule
async function updateRule(req, id) {
  const { organization, body, requestId } = req;

  // Ensure at least one field is provided for update
  if (!body.rule_name && !body.field && !body.operator && !body.value) {
    const err = new Error("No fields to update.");
    err.name = "ValidationError";
    throw err;
  }

  try {
    logger.info({
      message: "Updating rule",
      ruleId: id,
      requestBody: body,
      requestId,
    });

    const data = {};
    if (body.rule_name) data.rule_name = body.rule_name;
    if (body.field) data.field = body.field;
    if (body.operator) data.operator = body.operator;
    if (body.value) data.value = body.value;

    const updatedRule = await prisma.rule.update({
      where: {
        id: parseInt(id),
        organizationId: organization.id,
      },
      data,
    });

    logger.info({
      message: "Rule updated successfully",
      ruleId: id,
      requestId,
    });

    // Log the action
    await logAudit(req, {
      action: `Updated rule: ${body.rule_name || id}`,
    });

    return createResponse(true, updatedRule);
  } catch (error) {
    logger.error({
      message: "Error updating rule",
      ruleId: id,
      organizationId: organization.id,
      requestId,
      error,
    });
    throw error;
  }
}

// Delete a rule
async function deleteRule(req, id) {
  const { organization, requestId } = req;

  try {
    logger.info({
      message: "Deleting rule",
      ruleId: id,
      requestId,
    });

    await prisma.rule.delete({
      where: {
        id: parseInt(id),
        organizationId: organization.id,
      },
    });

    logger.info({
      message: "Rule deleted successfully",
      ruleId: id,
      requestId,
    });

    // Log the action
    await logAudit(req, {
      action: `Deleted rule with ID: ${id}`,
    });

    return createResponse(true, { id });
  } catch (error) {
    logger.error({
      message: "Error deleting rule",
      ruleId: id,
      organizationId: organization.id,
      requestId,
      error,
    });
    throw error;
  }
}

module.exports = {
  createRule,
  getRules,
  updateRule,
  deleteRule,
};
