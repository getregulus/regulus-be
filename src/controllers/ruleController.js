const prisma = require("@utils/prisma");
const logger = require("@utils/logger");
const { createResponse } = require("@utils/responseHandler");
const Joi = require("joi");
const { ValidationError } = require("joi");

const ruleSchema = Joi.object({
  rule_name: Joi.string().required(),
  condition: Joi.string().required(),
});

// Create a new rule
async function createRule(req) {
  const { organization, body, requestId } = req;
  
  const { error } = ruleSchema.validate(body);
  if (error) {
    const err = new ValidationError(error.details[0].message);
    throw err;
  }

  try {
    logger.info({
      message: "Creating rule",
      ruleName: body.rule_name,
      requestId,
    });

    const rule = await prisma.rule.create({
      data: {
        rule_name: body.rule_name,
        condition: body.condition,
        organizationId: organization.id,
      },
    });

    logger.info({
      message: "Rule created successfully",
      ruleId: rule.id,
      requestId,
    });

    return createResponse(true, rule);
  } catch (error) {
    logger.error({
      message: "Error creating rule",
      ruleName: body.rule_name,
      organizationId: organization.id,
      requestId,
      error,
    });
    throw error;
  }
}

// Get all rules for an organization
async function getRules(req) {
  const { organization, requestId } = req;

  try {
    logger.info({
      message: "Fetching rules",
      organizationId: organization.id,
      requestId,
    });

    const rules = await prisma.rule.findMany({
      where: { organizationId: organization.id },
      orderBy: { created_at: "desc" },
    });

    logger.info({
      message: `Fetched ${rules.length} rules`,
      organizationId: organization.id,
      requestId,
    });

    return createResponse(true, rules);
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
  const { rule_name, condition } = body;

  if (!rule_name && !condition) {
    const err = new Error("No fields to update.");
    err.name = "ValidationError";
    throw err;
  }

  try {
    logger.info({
      message: "Updating rule",
      ruleId: id,
      ruleName: rule_name,
      requestId,
    });

    const updatedRule = await prisma.rule.update({
      where: {
        id: parseInt(id),
        organizationId: organization.id,
      },
      data: { rule_name, condition },
    });

    logger.info({
      message: "Rule updated successfully",
      ruleId: id,
      requestId,
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
