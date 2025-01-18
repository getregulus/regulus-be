const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("@middleware/auth");
const { organizationContext } = require('@middleware/organization');
const {
  getTransactions,
  createTransaction,
} = require("@controllers/transactionController");

/**
 * @swagger
 * /transactions:
 *   get:
 *     summary: Get all transactions for an organization
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-organization-id
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization ID
 *     responses:
 *       200:
 *         description: List of transactions
 *       403:
 *         description: Not authorized
 *       500:
 *         description: Internal server error
 */
router.get("/", authenticate, organizationContext, authorize(["auditor", "admin"]), async (req, res) => {
  try {
    const transactions = await getTransactions(req.organizationId);
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /transactions:
 *   post:
 *     summary: Create a new transaction
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-organization-id
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               transaction_id:
 *                 type: string
 *                 example: txn_0002
 *               user_id:
 *                 type: string
 *                 example: user_002
 *               amount:
 *                 type: number
 *                 example: 5000
 *               currency:
 *                 type: string
 *                 example: USD
 *               country:
 *                 type: string
 *                 example: CA
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *                 example: 2025-01-02T12:00:00Z
 *     responses:
 *       201:
 *         description: Transaction created successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Not authorized
 *       409:
 *         description: Transaction ID already exists
 *       500:
 *         description: Internal server error
 */
router.post("/", authenticate, organizationContext, authorize(["auditor", "admin"]), async (req, res) => {
  try {
    const transaction = await createTransaction(req.body, req.organizationId);
    res.status(201).json(transaction);
  } catch (error) {
    if (error.message.includes('Validation')) {
      res.status(400).json({ error: error.message });
    } else if (error.code === 'P2002') {
      res.status(409).json({ error: 'Transaction ID already exists' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

module.exports = router;
