const safeEval = require("safe-eval");
const db = require("../models/db");
const Joi = require("joi");

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

  const { transaction_id, user_id, amount, currency, country, timestamp } =
    value;
  let flagged = amount > 10000 || country === "TR";
  let reasons = [];

  try {
    await db.query("BEGIN");

    await db.query(
      `INSERT INTO transactions (transaction_id, user_id, amount, currency, country, timestamp, flagged)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [transaction_id, user_id, amount, currency, country, timestamp, flagged]
    );

    // Fetch and evaluate custom rules
    const { rows: rules } = await db.query("SELECT * FROM rules");
    for (const rule of rules) {
      const context = { amount, country, currency, timestamp };
      if (safeEval(rule.condition, context)) {
        flagged = true;
        reasons.push(`Custom alert: ${rule.rule_name}`);
      }
    }

    // Insert alerts if flagged
    if (flagged) {
      await db.query(
        `INSERT INTO alerts (transaction_id, reason) VALUES ($1, $2)`,
        [transaction_id, reasons.join(", ")]
      );
    }

    await db.query("COMMIT"); // Commit transaction
    res.status(201).json({
      success: true,
      message: flagged ? "Transaction flagged!" : "Transaction created!",
    });
  } catch (error) {
    await db.query("ROLLBACK"); // Rollback transaction
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
