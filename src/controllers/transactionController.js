const db = require("../models/db");
const Joi = require("joi");
const { evaluateTransaction } = require("../utils/ruleEngine");

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
    const { rows } = await db.query("SELECT * FROM transactions");
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error in getTransactions:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createTransaction = async (req, res) => {
  const { error, value } = transactionSchema.validate(req.body);
  if (error) {
    return res
      .status(400)
      .json({ success: false, error: error.details[0].message });
  }

  const transaction = value;

  try {
    await db.query("BEGIN");

    // Fetch all rules from the database
    const { rows: rules } = await db.query("SELECT * FROM rules");

    // Evaluate transaction against rules
    const { flagged, reasons } = evaluateTransaction(transaction, rules);

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

    // Insert alerts if flagged
    if (flagged) {
      for (const reason of reasons) {
        await db.query(
          `INSERT INTO alerts (transaction_id, reason) VALUES ($1, $2)`,
          [transaction.transaction_id, reason]
        );
      }
    }

    // Commit transaction
    await db.query("COMMIT");

    res.status(201).json({
      success: true,
      message: flagged ? "Transaction flagged!" : "Transaction created!",
    });
  } catch (error) {
    // Rollback transaction
    await db.query("ROLLBACK");
    console.error("Error in createTransaction:", error.message);
    if (error.code === "23505") {
      res
        .status(400)
        .json({ success: false, error: "Duplicate transaction ID." });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};
