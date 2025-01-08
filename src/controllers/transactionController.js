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
    logger.info("Fetching all transactions");
    const transactions = await prisma.transaction.findMany();
    res.status(200).json(transactions);
    logger.info(`Fetched ${transactions.length} transactions successfully`);
  } catch (error) {
    logger.error(`Error in getTransactions: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create a new transaction
exports.createTransaction = async (req, res) => {
  const { error, value } = transactionSchema.validate(req.body);
  if (error) {
    logger.warn(`Validation failed: ${error.details[0].message}`);
    return res
      .status(400)
      .json({ success: false, error: error.details[0].message });
  }

  const transaction = value;

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

      // Fetch all rules from the database
      const rules = await tx.rule.findMany();
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
      const flagged = watchlistFlagged || rulesFlagged;
      const reasons = [...watchlistReasons, ...ruleReasons];

      // Insert the transaction
      await tx.transaction.create({
        data: {
          transaction_id: transaction.transaction_id,
          user_id: transaction.user_id,
          amount: transaction.amount,
          currency: transaction.currency,
          country: transaction.country,
          timestamp: transaction.timestamp,
          flagged,
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
        }));
        await tx.alert.createMany({
          data: alertData,
        });
        logger.info(
          `Alerts created for transaction ${transaction.transaction_id}`
        );
      }
    });

    logger.info(
      `Transaction ${transaction.transaction_id} committed successfully`
    );

    res.status(201).json({
      success: true,
      message: flagged ? "Transaction flagged!" : "Transaction created!",
    });
  } catch (error) {
    logger.error(
      `Error in createTransaction for transaction ${transaction.transaction_id}: ${error.message}`
    );
    if (error.code === "P2002") {
      // Prisma unique constraint error code
      res
        .status(400)
        .json({ success: false, error: "Duplicate transaction ID." });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};
