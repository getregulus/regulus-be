const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("@middleware/auth");
const { logAudit } = require("@utils/auditLogger");
const pino = require("@utils/logger");
const {
  getRules,
  createRule,
  updateRule,
  deleteRule,
} = require("@controllers/ruleController");

/**
 * @swagger
 * /rules:
 *   get:
 *     summary: Get all rules
 *     tags: [Rules]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all rules.
 */
router.get("/", authenticate, authorize(["admin"]), async (req, res) => {
  try {
    const rules = await getRules();

    if (!rules || rules.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No rules found." });
    }

    await logAudit(req.user.id, "Viewed Rules");

    return res.status(200).json(rules);
  } catch (error) {
    pino.error({ message: "Error fetching rules", error: error.message });
    return res.status(500).json({ error: "Internal server error." });
  }
});

/**
 * @swagger
 * /rules:
 *   post:
 *     summary: Create a new rule
 *     tags: [Rules]
 *     security:
 *       - bearerAuth: []
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
 *         description: Rule name must be unique.
 *       500:
 *         description: Internal server error.
 */
router.post("/", authenticate, authorize(["admin"]), async (req, res) => {
  try {
    const { rule_name, condition } = req.body;

    const rule = await createRule({ rule_name, condition });

    if (!rule || !rule.id) {
      pino.error({ message: "Invalid response from createRule" });
      return res
        .status(500)
        .json({ success: false, error: "Failed to create rule." });
    }

    await logAudit(req.user.id, "Created Rule", rule.id, "rule");

    return res
      .status(201)
      .json({ success: true, rule, message: "Rule created successfully!" });
  } catch (error) {
    if (error.name === "DuplicateRuleError") {
      pino.warn({ message: "Duplicate rule name error", rule_name });
      return res.status(400).json({ success: false, error: error.message });
    }
    pino.error({ message: "Error creating rule", error: error.message });
    return res.status(500).json({ error: "Internal server error." });
  }
});

/**
 * @swagger
 * /rules/{id}:
 *   put:
 *     summary: Update a rule
 *     tags: [Rules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: ID of the rule to update
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
 */
router.put("/:id", authenticate, authorize(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;

    const updatedRule = await updateRule(id, req.body);

    if (!updatedRule) {
      return res
        .status(404)
        .json({ success: false, message: "Rule not found." });
    }

    await logAudit(req.user.id, "Updated Rule", id, "rule");

    return res
      .status(200)
      .json({ success: true, message: "Rule updated successfully!" });
  } catch (error) {
    pino.error({ message: "Error updating rule", error: error.message });
    return res.status(500).json({ error: "Internal server error." });
  }
});

/**
 * @swagger
 * /rules/{id}:
 *   delete:
 *     summary: Delete a rule
 *     tags: [Rules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: ID of the rule to delete
 *     responses:
 *       200:
 *         description: Rule deleted successfully.
 */
router.delete("/:id", authenticate, authorize(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await deleteRule(id);

    if (!result) {
      return res
        .status(404)
        .json({ success: false, message: "Rule not found." });
    }

    await logAudit(req.user.id, "Deleted Rule", id, "rule");

    return res
      .status(200)
      .json({ success: true, message: "Rule deleted successfully." });
  } catch (error) {
    pino.error({ message: "Error deleting rule", error: error.message });
    return res.status(500).json({ error: "Internal server error." });
  }
});

module.exports = router;
