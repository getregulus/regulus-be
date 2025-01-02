const db = require("../models/db");

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
  try {
    const { transaction_id, user_id, amount, currency, country, timestamp } =
      req.body;

    const flagged = amount > 10000 || country === "TR";

    await db.query(
      `INSERT INTO transactions (transaction_id, user_id, amount, currency, country, timestamp, flagged)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [transaction_id, user_id, amount, currency, country, timestamp, flagged]
    );

    res.status(201).json({ success: true, message: "Transaction created!" });
  } catch (error) {
    console.error("Error in createTransaction:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};
