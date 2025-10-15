const express = require("express");
const router = express.Router();
const { organizationContext } = require("@middleware/organization");
const { checkSubscription } = require("@middleware/subscription");
const { validateSchema } = require("@middleware/validation");
const { apiLimiter } = require("@middleware/rateLimiter");
const Joi = require("joi");
const {
  getTransactions,
  createTransaction,
} = require("@controllers/transactionController");

// Validation schemas
const createTransactionSchema = Joi.object({
  transaction_id: Joi.string().required(),
  user_id: Joi.string().required(),
  amount: Joi.number().positive().required(),
  currency: Joi.string().length(3).required(),
  country: Joi.string().required(),
  timestamp: Joi.date().iso().required(),
});

// Middleware to handle hybrid authentication (JWT or API Key)
const hybridAuth = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  if (apiKey) {
    return require("@middleware/apiKeyMiddleware")(req, res, next);
  }
  return require("@middleware/auth").authenticate(req, res, next);
};

/**
 * @swagger
 * /transactions:
 *   get:
 *     summary: Get all transactions with pagination
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: header
 *         name: x-organization-id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 25
 *         description: Number of items per page (max 100)
 *     responses:
 *       200:
 *         description: Paginated list of transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 total:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transaction'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get(
  "/",
  apiLimiter,
  hybridAuth,
  organizationContext,
  async (req, res, next) => {
    try {
      const result = await getTransactions(req);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /transactions:
 *   post:
 *     summary: Create a new transaction
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: header
 *         name: x-organization-id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - transaction_id
 *               - user_id
 *               - amount
 *               - currency
 *               - country
 *               - timestamp
 *             properties:
 *               transaction_id:
 *                 type: string
 *                 example: "txn_123456"
 *               user_id:
 *                 type: string
 *                 example: "user_123"
 *               amount:
 *                 type: number
 *                 minimum: 0
 *                 example: 100.50
 *               currency:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 3
 *                 example: "USD"
 *               country:
 *                 type: string
 *                 example: "US"
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Transaction created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Transaction'
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Invalid organization or insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Conflict - Transaction ID already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many requests
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/",
  apiLimiter,
  hybridAuth,
  organizationContext,
  checkSubscription,
  validateSchema(createTransactionSchema),
  async (req, res, next) => {
    try {
      const result = await createTransaction(req, req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
