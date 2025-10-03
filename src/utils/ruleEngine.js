const logger = require("./logger");
const { ValidationError } = require("./errors");

// Rule operators and their implementations
const operatorMappings = {
  GREATER_THAN: (a, b) => a > b,
  LESS_THAN: (a, b) => a < b,
  GREATER_THAN_OR_EQUAL: (a, b) => a >= b,
  LESS_THAN_OR_EQUAL: (a, b) => a <= b,
  EQUAL: (a, b) => a == b,
  NOT_EQUAL: (a, b) => a != b,
  IN: (a, b) => b.includes(a),
};

const evaluateCondition = (transaction, condition) => {
  const { field, operator, value } = condition;

  // Ensure the field exists in the transaction
  if (!(field in transaction)) {
    logger.warn({
      message: "Field not found in transaction",
      field,
      transactionId: transaction.transaction_id,
    });
    throw new ValidationError(
      `Field "${field}" is not found in the transaction.`
    );
  }

  // Ensure the operator is valid
  const operatorFunction = operatorMappings[operator];
  if (!operatorFunction) {
    throw new ValidationError(`Unsupported operator: ${operator}`);
  }

  try {
    // Parse the value based on the field type
    let parsedValue = value;
    if (typeof transaction[field] === "number") {
      parsedValue = Number(value);
    }

    // Evaluate the condition
    const result = operatorFunction(transaction[field], parsedValue);

    logger.debug({
      message: "Rule condition evaluated",
      transactionId: transaction.transaction_id,
      field,
      operator,
      value: parsedValue,
      result,
    });

    return result;
  } catch (error) {
    logger.error({
      message: "Error evaluating rule condition",
      transactionId: transaction.transaction_id,
      condition: { field, operator, value },
      error: error.message,
    });
    throw error;
  }
};

// Evaluate a transaction against all rules
const evaluateTransaction = (transaction, rules) => {
  logger.info({
    message: "Evaluating transaction against rules",
    transactionId: transaction.transaction_id,
    ruleCount: rules.length,
  });

  const results = {
    flagged: false,
    reasons: [],
    matchedRules: [],
  };

  for (const rule of rules) {
    try {
      const matches = evaluateCondition(transaction, rule);

      if (matches) {
        results.flagged = true;
        results.reasons.push(rule.rule_name);
        results.matchedRules.push(rule);

        logger.info({
          message: "Transaction matched rule",
          transactionId: transaction.transaction_id,
          ruleName: rule.rule_name,
        });
      }
    } catch (error) {
      logger.error({
        message: "Error processing rule",
        transactionId: transaction.transaction_id,
        ruleId: rule.id,
        error: error.message,
      });
    }
  }

  logger.info({
    message: "Transaction evaluation completed",
    transactionId: transaction.transaction_id,
    flagged: results.flagged,
    matchedRules: results.reasons,
  });

  return results;
};

module.exports = {
  evaluateTransaction,
  evaluateCondition,
};
