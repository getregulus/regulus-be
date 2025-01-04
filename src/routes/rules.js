const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("@middleware/auth");
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
router.get("/", authenticate, authorize(["admin"]), getRules);

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
 */
router.post("/", authenticate, authorize(["admin"]), createRule);

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
router.put("/:id", authenticate, authorize(["admin"]), updateRule);

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
router.delete("/:id", authenticate, authorize(["admin"]), deleteRule);

module.exports = router;
