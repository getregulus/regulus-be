const db = require("@models/db");
const pino = require("@utils/logger");

// Fetch all rules
exports.getRules = async () => {
  try {
    pino.info({ message: "Fetching all rules..." });
    const { rows } = await db.query(
      "SELECT * FROM rules ORDER BY created_at DESC"
    );
    pino.info({ message: "Rules fetched successfully", count: rows.length });
    return rows;
  } catch (error) {
    pino.error({ message: "Error fetching rules", error: error.message });
    throw new Error("Failed to fetch rules.");
  }
};

// Create a new rule
exports.createRule = async ({ rule_name, condition }) => {
  try {
    pino.info({ message: "Creating rule...", rule_name, condition });
    const { rows } = await db.query(
      "INSERT INTO rules (rule_name, condition) VALUES ($1, $2) RETURNING *",
      [rule_name, condition]
    );
    pino.info({ message: "Rule created successfully", rule: rows[0] });
    return rows[0];
  } catch (error) {
    if (error.code === "23505") {
      // PostgreSQL duplicate key error code
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
    const { rowCount } = await db.query(
      "UPDATE rules SET rule_name = $1, condition = $2 WHERE id = $3 RETURNING *",
      [rule_name, condition, id]
    );
    if (rowCount === 0) {
      pino.warn({ message: "Rule not found during update", id });
      throw new Error("Rule not found.");
    }
    pino.info({ message: "Rule updated successfully", id, rule_name });
    return true;
  } catch (error) {
    pino.error({ message: "Error updating rule", id, error: error.message });
    throw new Error(error.message);
  }
};

// Delete a rule
exports.deleteRule = async (id) => {
  try {
    pino.info({ message: "Deleting rule...", id });
    const { rowCount } = await db.query("DELETE FROM rules WHERE id = $1", [
      id,
    ]);
    if (rowCount === 0) {
      pino.warn({ message: "Rule not found during delete", id });
      throw new Error("Rule not found.");
    }
    pino.info({ message: "Rule deleted successfully", id });
    return true;
  } catch (error) {
    pino.error({ message: "Error deleting rule", id, error: error.message });
    throw new Error(error.message);
  }
};
