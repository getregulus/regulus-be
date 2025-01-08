const prisma = require('@utils/prisma');
const pino = require("@utils/logger");

// Fetch all rules
exports.getRules = async () => {
  try {
    pino.info({ message: "Fetching all rules..." });
    const rules = await prisma.rule.findMany({
      orderBy: { created_at: "desc" },
    });
    pino.info({ message: "Rules fetched successfully", count: rules.length });
    return rules;
  } catch (error) {
    pino.error({ message: "Error fetching rules", error: error.message });
    throw new Error("Failed to fetch rules.");
  }
};

// Create a new rule
exports.createRule = async ({ rule_name, condition }) => {
  try {
    pino.info({ message: "Creating rule...", rule_name, condition });
    const rule = await prisma.rule.create({
      data: { rule_name, condition },
    });
    pino.info({ message: "Rule created successfully", rule });
    return rule;
  } catch (error) {
    if (error.code === "P2002") {
      // Prisma unique constraint error code
      pino.warn({ message: "Duplicate rule name detected", rule_name });
      throw new Error("Rule name must be unique.");
    }
    pino.error({ message: "Error creating rule", error: error.message });
    throw new Error("Failed to create rule.");
  }
};

// Update an existing rule
exports.updateRule = async (id, { rule_name, condition }) => {
  try {
    pino.info({ message: "Updating rule...", id, rule_name, condition });
    const updatedRule = await prisma.rule.update({
      where: { id: parseInt(id) },
      data: { rule_name, condition },
    });
    pino.info({ message: "Rule updated successfully", id, rule_name });
    return updatedRule;
  } catch (error) {
    if (error.code === "P2025") {
      // Prisma record not found error code
      pino.warn({ message: "Rule not found during update", id });
      throw new Error("Rule not found.");
    }
    pino.error({ message: "Error updating rule", id, error: error.message });
    throw new Error(error.message);
  }
};

// Delete a rule
exports.deleteRule = async (id) => {
  try {
    pino.info({ message: "Deleting rule...", id });
    await prisma.rule.delete({
      where: { id: parseInt(id) },
    });
    pino.info({ message: "Rule deleted successfully", id });
    return true;
  } catch (error) {
    if (error.code === "P2025") {
      // Prisma record not found error code
      pino.warn({ message: "Rule not found during delete", id });
      throw new Error("Rule not found.");
    }
    pino.error({ message: "Error deleting rule", id, error: error.message });
    throw new Error(error.message);
  }
};
