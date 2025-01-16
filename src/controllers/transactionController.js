const prisma = require("@utils/prisma");
const Joi = require("joi");
const { evaluateTransaction } = require("@utils/ruleEngine");
const { checkWatchlist } = require("@utils/watchlistCheck");
const logger = require("@utils/logger");

const transactionSchema = Joi.object({
  transaction_id: Joi.string().required(),
  user_id: Joi.string().required(),
  amount: Joi.number().positive().required(),
  currency: Joi.string().length(3).required(),
  country: Joi.string().required(),
  timestamp: Joi.date().required(),
});

// Fetch all transactions
exports.getTransactions = async (req, res) => {
  try {
    logger.info("Fetching all transactions for organization ID:", req.organizationId);
    const transactions = await prisma.transaction.findMany({
      where: { organizationId: req.organizationId } // Filter by organization ID
    });
    res.status(200).json(transactions);
    logger.info(`Fetched ${transactions.length} transactions successfully`);
  } catch (error) {
    logger.error(`Error in getTransactions: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create a new transaction
exports.createTransaction = async (transactionData, organizationId) => {
  const { error, value } = transactionSchema.validate(transactionData);
  if (error) {
    logger.warn(`Validation failed: ${error.details[0].message}`);
    throw new Error(error.details[0].message); // Throw an error for validation failure
  }

  const transaction = value;
  let flagged = false; // Initialize flagged variable

  try {
    logger.info(`Processing transaction: ${transaction.transaction_id}`);

    // Start a Prisma transaction
    await prisma.$transaction(async (tx) => {
      // Check against the watchlist
      const { flagged: watchlistFlagged, reasons: watchlistReasons } =
        await checkWatchlist(transaction);
      logger.info(
        `Watchlist check completed for transaction ${transaction.transaction_id}: flagged=${watchlistFlagged}`
      );

      // Fetch all rules from the database for the organization
      const rules = await tx.rule.findMany({
        where: { organizationId } // Use the passed organizationId
      });
      logger.info(
        `Fetched ${rules.length} rules for transaction ${transaction.transaction_id}`
      );

      // Evaluate transaction against rules
      const { flagged: rulesFlagged, reasons: ruleReasons } =
        evaluateTransaction(transaction, rules);
      logger.info(
        `Rule evaluation completed for transaction ${transaction.transaction_id}: flagged=${rulesFlagged}`
      );

      // Combine results from watchlist and rules
      flagged = watchlistFlagged || rulesFlagged; // Set flagged based on evaluations
      const reasons = [...watchlistReasons, ...ruleReasons];

      // Insert the transaction with organizationId
      await tx.transaction.create({
        data: {
          transaction_id: transaction.transaction_id,
          user_id: transaction.user_id,
          amount: transaction.amount,
          currency: transaction.currency,
          country: transaction.country,
          timestamp: transaction.timestamp,
          flagged,
          organizationId // Use the passed organizationId
        },
      });
      logger.info(
        `Transaction ${transaction.transaction_id} ${
          flagged ? "flagged" : "inserted successfully"
        }`
      );

      // Insert alerts if flagged
      if (flagged) {
        const alertData = reasons.map((reason) => ({
          transaction_id: transaction.transaction_id,
          reason,
          organizationId // Ensure alerts are linked to the organization
        }));
        await tx.alert.createMany({
          data: alertData,
        });
        logger.info(
          `Alerts created for transaction ${transaction.transaction_id}: ${JSON.stringify(alertData)}`
        );
      }
    });

    logger.info(
      `Transaction ${transaction.transaction_id} committed successfully`
    );

    return {
      success: true,
      message: flagged ? "Transaction flagged!" : "Transaction created!",
    };
  } catch (error) {
    logger.error(
      `Error in createTransaction for transaction ${transaction.transaction_id}: ${error.message}`
    );
    throw error; // Rethrow the error to be handled in the route
  }
};
