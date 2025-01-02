const safeEval = require("safe-eval");

/**
 * Evaluates a transaction against a list of rules.
 * @param {Object} transaction - The transaction to evaluate.
 * @param {Array} rules - Array of rules to evaluate against.
 * @returns {Object} - An object containing `flagged` status and reasons.
 */
const evaluateTransaction = (transaction, rules) => {
  const flaggedReasons = [];

  for (const rule of rules) {
    try {
      const context = {
        amount: transaction.amount,
        country: transaction.country,
        currency: transaction.currency,
        timestamp: transaction.timestamp,
      };

      if (safeEval(rule.condition, context)) {
        flaggedReasons.push(`Custom rule triggered: ${rule.rule_name}`);
      }
    } catch (error) {
      console.error(
        `Error evaluating rule "${rule.rule_name}":`,
        error.message
      );
    }
  }

  return {
    flagged: flaggedReasons.length > 0,
    reasons: flaggedReasons,
  };
};

module.exports = { evaluateTransaction };
