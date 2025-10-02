const prisma = require("@utils/prisma");
const Joi = require("joi");
const { evaluateTransaction } = require("@utils/ruleEngine");
const { checkWatchlist } = require("@utils/watchlistCheck");
const logger = require("@utils/logger");
const { logAudit } = require("@utils/auditLogger");
const { createResponse } = require("@utils/responseHandler");
const { sendAlertNotifications } = require("@utils/notificationService");

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
    const watchlistMatches = await tx.watchlist.findMany({
      where: {
        OR: [
          {
            type: 'USER',
            value: transaction.user_id
          },
          {
            type: 'COUNTRY',
            value: transaction.country
          }
        ]
      }
    });

    const watchlistFlagged = watchlistMatches.length > 0;
    const watchlistReasons = watchlistMatches.map(match => 
      `Watchlist match: ${match.type} (${match.value}) - ${match.description || match.risk_level} risk`
    );

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
    const { flagged: rulesFlagged, reasons: ruleReasons, matchedRules } = evaluateTransaction(
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

      // Log flagged transaction
      await logAudit(req, {
        action: `Transaction Flagged: ${transaction.transaction_id}`,
      });
    } else {
      // Log created transaction
      await logAudit(req, {
        action: `Transaction Created: ${transaction.transaction_id}`,
      });
    }

    return { createdTransaction, flagged, reasons, matchedRules };
  });

  logger.info({
    message: "Transaction processed successfully",
    transactionId: transaction.transaction_id,
    flagged: result.flagged,
    requestId,
  });

  // TODO Will add BullMQ 
  // Send notifications asynchronously (don't block the response)
  if (result.flagged && result.matchedRules && result.matchedRules.length > 0) {
    // Send notifications for each matched rule
    setImmediate(async () => {
      try {
        // Get the created alerts
        const alerts = await prisma.alert.findMany({
          where: {
            transaction_id: transaction.transaction_id,
            organizationId,
          },
        });

        // Send notification for each matched rule
        for (const rule of result.matchedRules) {
          const relevantAlert = alerts.find(a => a.reason.includes(rule.rule_name));
          if (relevantAlert) {
            await sendAlertNotifications(
              relevantAlert,
              result.createdTransaction,
              rule,
              organizationId
            );
          }
        }
      } catch (error) {
        logger.error({
          message: "Error sending alert notifications",
          transactionId: transaction.transaction_id,
          error: error.message,
        });
      }
    });
  }

  return createResponse(true, {
    transaction: result.createdTransaction,
    flagged: result.flagged,
  });
}

module.exports = {
  getTransactions,
  createTransaction,
};
