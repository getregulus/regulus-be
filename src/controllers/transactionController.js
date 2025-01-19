const prisma = require("@utils/prisma");
const Joi = require("joi");
const { evaluateTransaction } = require("@utils/ruleEngine");
const { checkWatchlist } = require("@utils/watchlistCheck");
const logger = require("@utils/logger");
const { logAudit } = require("@utils/auditLogger");
const { createResponse } = require("@utils/responseHandler");

const transactionSchema = Joi.object({
  transaction_id: Joi.string().required(),
  user_id: Joi.string().required(),
  amount: Joi.number().positive().required(),
  currency: Joi.string().length(3).required(),
  country: Joi.string().required(),
  timestamp: Joi.date().required(),
});

// Fetch all transactions
async function getTransactions(req) {
  const { organization, requestId } = req;
  const organizationId = organization.id;

  try {
    logger.info({
      message: "Fetching transactions",
      organizationId,
      requestId,
    });

    const transactions = await prisma.transaction.findMany({
      where: { organizationId },
      select: {
        id: true,
        transaction_id: true,
        amount: true,
        currency: true,
        flagged: true,
        timestamp: true,
        user_id: true,
        country: true,
      },
    });

    logger.info({
      message: `Fetched ${transactions.length} transactions`,
      organizationId,
      requestId,
    });

    return createResponse(true, transactions);
  } catch (error) {
    logger.error({
      message: "Error fetching transactions",
      organizationId,
      requestId,
      error,
    });
    throw error;
  }
}

// Create a new transaction
async function createTransaction(req, transactionData) {
  const { organization, requestId } = req;
  const organizationId = organization.id;

  const { error, value } = transactionSchema.validate(transactionData);
  if (error) {
    const err = new Error(error.details[0].message);
    err.name = "ValidationError";
    throw err;
  }

  const transaction = value;
  let flagged = false;

  logger.info({
    message: "Processing transaction",
    transactionId: transaction.transaction_id,
    requestId,
  });

  // Start a Prisma transaction
  const result = await prisma.$transaction(async (tx) => {
    // Check against the watchlist
    const { flagged: watchlistFlagged, reasons: watchlistReasons } =
      await checkWatchlist(transaction);

    logger.info({
      message: "Watchlist check completed",
      transactionId: transaction.transaction_id,
      flagged: watchlistFlagged,
      requestId,
    });

    // Fetch rules
    const rules = await tx.rule.findMany({
      where: { organizationId },
    });

    // Evaluate transaction
    const { flagged: rulesFlagged, reasons: ruleReasons } = evaluateTransaction(
      transaction,
      rules
    );

    flagged = watchlistFlagged || rulesFlagged;
    const reasons = [...watchlistReasons, ...ruleReasons];

    // Create transaction
    const createdTransaction = await tx.transaction.create({
      data: {
        ...transaction,
        flagged,
        organizationId,
      },
    });

    // Create alerts if flagged
    if (flagged) {
      const alertData = reasons.map((reason) => ({
        transaction_id: transaction.transaction_id,
        reason,
        organizationId,
      }));
      await tx.alert.createMany({
        data: alertData,
      });

      await logAudit(
        transaction.user_id,
        "Transaction Flagged",
        organizationId,
        transaction.transaction_id,
        "transaction"
      );
    } else {
      await logAudit(
        transaction.user_id,
        "Transaction Created",
        organizationId,
        transaction.transaction_id,
        "transaction"
      );
    }

    return { createdTransaction, flagged };
  });

  logger.info({
    message: "Transaction processed successfully",
    transactionId: transaction.transaction_id,
    flagged: result.flagged,
    requestId,
  });

  return createResponse(true, {
    transaction: result.createdTransaction,
    flagged: result.flagged,
  });
}

module.exports = {
  getTransactions,
  createTransaction,
};
