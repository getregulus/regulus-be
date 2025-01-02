const db = require("../models/db");
const Joi = require("joi");
const { evaluateTransaction } = require("../utils/ruleEngine");
const { checkWatchlist } = require("../utils/watchlistCheck");
const logger = require("../utils/logger");

const transactionSchema = Joi.object({
  transaction_id: Joi.string().required(),
  user_id: Joi.string().required(),
  amount: Joi.number().positive().required(),
  currency: Joi.string().length(3).required(),
  country: Joi.string().required(),
  timestamp: Joi.date().required(),
});

exports.getTransactions = async (req, res) => {
  try {
    logger.info("Fetching all transactions");
    const { rows } = await db.query("SELECT * FROM transactions");
    res.status(200).json(rows);
    logger.info(`Fetched ${rows.length} transactions successfully`);
  } catch (error) {
    logger.error(`Error in getTransactions: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
};

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
    await db.query("BEGIN");

    // Check against the watchlist
    const { flagged: watchlistFlagged, reasons: watchlistReasons } =
      await checkWatchlist(transaction);
    logger.info(
      `Watchlist check completed for transaction ${transaction.transaction_id}: flagged=${watchlistFlagged}`
    );

    // Fetch all rules from the database
    const { rows: rules } = await db.query("SELECT * FROM rules");
    logger.info(
      `Fetched ${rules.length} rules for transaction ${transaction.transaction_id}`
    );

    // Evaluate transaction against rules
    const { flagged: rulesFlagged, reasons: ruleReasons } = evaluateTransaction(
      transaction,
      rules
    );
    logger.info(
      `Rule evaluation completed for transaction ${transaction.transaction_id}: flagged=${rulesFlagged}`
    );

    // Combine results from watchlist and rules
    const flagged = watchlistFlagged || rulesFlagged;
    const reasons = [...watchlistReasons, ...ruleReasons];

    // Insert the transaction into the database
    await db.query(
      `INSERT INTO transactions (transaction_id, user_id, amount, currency, country, timestamp, flagged)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        transaction.transaction_id,
        transaction.user_id,
        transaction.amount,
        transaction.currency,
        transaction.country,
        transaction.timestamp,
        flagged,
      ]
    );
    logger.info(
      `Transaction ${transaction.transaction_id} ${
        flagged ? "flagged" : "inserted successfully"
      }`
    );

    // Insert alerts if flagged
    if (flagged) {
      for (const reason of reasons) {
        await db.query(
          `INSERT INTO alerts (transaction_id, reason) VALUES ($1, $2)`,
          [transaction.transaction_id, reason]
        );
        logger.info(
          `Alert created for transaction ${transaction.transaction_id}: ${reason}`
        );
      }
    }

    // Commit transaction
    await db.query("COMMIT");
    logger.info(
      `Transaction ${transaction.transaction_id} committed successfully`
    );

    res.status(201).json({
      success: true,
      message: flagged ? "Transaction flagged!" : "Transaction created!",
    });
  } catch (error) {
    // Rollback transaction
    await db.query("ROLLBACK");
    logger.error(
      `Error in createTransaction for transaction ${transaction.transaction_id}: ${error.message}`
    );
    if (error.code === "23505") {
      res
        .status(400)
        .json({ success: false, error: "Duplicate transaction ID." });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};
