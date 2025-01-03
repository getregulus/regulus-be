const express = require("express");
const router = express.Router();
const db = require("@models/db");
const Joi = require("joi");

// Validation schema
const ruleSchema = Joi.object({
  rule_name: Joi.string().required(),
  condition: Joi.string().required(),
});

/**
 * @swagger
 * /rules:
 *   get:
 *     summary: Get all rules
 *     tags: [Rules]
 *     responses:
 *       200:
 *         description: List of all rules.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   rule_name:
 *                     type: string
 *                     example: High-Value Transactions
 *                   condition:
 *                     type: string
 *                     example: amount > 10000
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                     example: 2025-01-01T10:00:00Z
 */
router.get("/", async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM rules ORDER BY created_at DESC"
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error in fetching rules:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /rules:
 *   post:
 *     summary: Add a new rule
 *     tags: [Rules]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rule_name:
 *                 type: string
 *                 example: High-Value Transactions
 *               condition:
 *                 type: string
 *                 example: amount > 10000
 *     responses:
 *       201:
 *         description: Rule created successfully.
 *       400:
 *         description: Validation or duplicate error.
 */
router.post("/", async (req, res) => {
  const { error, value } = ruleSchema.validate(req.body);
  if (error) {
    return res
      .status(400)
      .json({ success: false, error: error.details[0].message });
  }

  const { rule_name, condition } = value;

  try {
    // Insert into the database
    await db.query(`INSERT INTO rules (rule_name, condition) VALUES ($1, $2)`, [
      rule_name,
      condition,
    ]);
    res
      .status(201)
      .json({ success: true, message: "Rule created successfully!" });
  } catch (error) {
    if (error.code === "23505") {
      // PostgreSQL unique constraint violation
      res
        .status(400)
        .json({ success: false, error: "Rule name already exists." });
    } else {
      console.error("Error in creating rule:", error.message);
      res.status(500).json({ success: false, error: "Internal server error." });
    }
  }
});

/**
 * @swagger
 * /rules/{id}:
 *   delete:
 *     summary: Delete a rule by ID
 *     tags: [Rules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the rule to delete
 *     responses:
 *       200:
 *         description: Rule deleted successfully.
 *       404:
 *         description: Rule not found.
 */
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const { rowCount } = await db.query("DELETE FROM rules WHERE id = $1", [
      id,
    ]);
    if (rowCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Rule not found." });
    }
    res
      .status(200)
      .json({ success: true, message: "Rule deleted successfully!" });
  } catch (error) {
    console.error("Error in deleting rule:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /rules/{id}:
 *   put:
 *     summary: Update a rule by ID
 *     tags: [Rules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the rule to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rule_name:
 *                 type: string
 *                 example: Updated Rule
 *               condition:
 *                 type: string
 *                 example: amount > 20000
 *     responses:
 *       200:
 *         description: Rule updated successfully.
 *       404:
 *         description: Rule not found.
 */
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { rule_name, condition } = req.body;

  try {
    const { rowCount } = await db.query(
      `UPDATE rules SET rule_name = $1, condition = $2 WHERE id = $3`,
      [rule_name, condition, id]
    );
    if (rowCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Rule not found." });
    }
    res
      .status(200)
      .json({ success: true, message: "Rule updated successfully!" });
  } catch (error) {
    console.error("Error in updating rule:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
