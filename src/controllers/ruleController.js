const db = require("@models/db");

exports.getRules = async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM rules ORDER BY created_at DESC"
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error in fetching rules:", error.message);
    res.status(500).json({ error: "Internal server error." });
  }
};

exports.createRule = async (req, res) => {
  const { rule_name, condition } = req.body;

  try {
    await db.query("INSERT INTO rules (rule_name, condition) VALUES ($1, $2)", [
      rule_name,
      condition,
    ]);
    res.status(201).json({ message: "Rule created successfully." });
  } catch (error) {
    console.error("Error in creating rule:", error.message);
    res.status(500).json({ error: "Internal server error." });
  }
};

exports.updateRule = async (req, res) => {
  const { id } = req.params;
  const { rule_name, condition } = req.body;

  try {
    const { rowCount } = await db.query(
      "UPDATE rules SET rule_name = $1, condition = $2 WHERE id = $3",
      [rule_name, condition, id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: "Rule not found." });
    }
    res.status(200).json({ message: "Rule updated successfully." });
  } catch (error) {
    console.error("Error in updating rule:", error.message);
    res.status(500).json({ error: "Internal server error." });
  }
};

exports.deleteRule = async (req, res) => {
  const { id } = req.params;

  try {
    const { rowCount } = await db.query("DELETE FROM rules WHERE id = $1", [
      id,
    ]);
    if (rowCount === 0) {
      return res.status(404).json({ error: "Rule not found." });
    }
    res.status(200).json({ message: "Rule deleted successfully." });
  } catch (error) {
    console.error("Error in deleting rule:", error.message);
    res.status(500).json({ error: "Internal server error." });
  }
};
