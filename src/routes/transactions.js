const express = require("express");
const router = express.Router();
const {
  getTransactions,
  createTransaction,
} = require("@controllers/transactionController");

/**
 * @swagger
 * /transactions:
 *   get:
 *     summary: Get all transactions
 *     tags: [Transactions]
 *     responses:
 *       200:
 *         description: List of all transactions.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   transaction_id:
 *                     type: string
 *                     example: txn_0001
 *                   user_id:
 *                     type: string
 *                     example: user_001
 *                   amount:
 *                     type: number
 *                     example: 15000
 *                   currency:
 *                     type: string
 *                     example: USD
 *                   country:
 *                     type: string
 *                     example: US
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *                     example: 2025-01-01T10:00:00Z
 *                   flagged:
 *                     type: boolean
 *                     example: true
 */
router.get("/", getTransactions);

/**
 * @swagger
 * /transactions:
 *   post:
 *     summary: Create a new transaction
 *     tags: [Transactions]
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
 *         description: Transaction created successfully.
 *       400:
 *         description: Validation error.
 */
router.post("/", createTransaction);

module.exports = router;
