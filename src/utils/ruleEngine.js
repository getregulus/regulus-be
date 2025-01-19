const logger = require("./logger");
const { ValidationError } = require("./errors");

// Rule operators and their implementations
const operators = {
  ">": (a, b) => a > b,
  "<": (a, b) => a < b,
  ">=": (a, b) => a >= b,
  "<=": (a, b) => a <= b,
  "==": (a, b) => a == b,
  "!=": (a, b) => a != b,
  in: (a, b) => b.includes(a),
  contains: (a, b) => a.includes(b),
  startsWith: (a, b) => a.startsWith(b),
  endsWith: (a, b) => a.endsWith(b),
};

const parseCondition = (condition) => {
  try {
    const parts = condition.trim().split(/\s+/);
    if (parts.length < 3) {
      throw new ValidationError("Invalid rule condition format");
    }

    const [field, operator, ...valueParts] = parts;
    const value = valueParts.join(" ");

    if (!operators[operator]) {
      throw new ValidationError(`Unsupported operator: ${operator}`);
    }

    return { field, operator, value };
  } catch (error) {
    logger.error({
      message: "Error parsing rule condition",
      condition,
      error: error.message,
    });
    throw error;
  }
};

const evaluateCondition = (transaction, condition) => {
  const { field, operator, value } = parseCondition(condition);

  if (!(field in transaction)) {
    logger.warn({
      message: "Field not found in transaction",
      field,
      transactionId: transaction.transaction_id,
    });
    return false;
  }

  try {
    // Convert value based on field type
    let parsedValue = value;
    if (typeof transaction[field] === "number") {
      parsedValue = Number(value);
    }

    const result = operators[operator](transaction[field], parsedValue);

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
    return false;
  }
};

const evaluateTransaction = (transaction, rules) => {
  logger.info({
    message: "Evaluating transaction against rules",
    transactionId: transaction.transaction_id,
    ruleCount: rules.length,
  });

  const results = {
    flagged: false,
    reasons: [],
  };

  for (const rule of rules) {
    try {
      const matches = evaluateCondition(transaction, rule.condition);

      if (matches) {
        results.flagged = true;
        results.reasons.push(rule.rule_name);

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
  parseCondition,
  evaluateCondition,
};
