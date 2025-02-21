const prisma = require("./prisma");
const logger = require("./logger");

async function checkWatchlist(transaction) {
  try {
    // Check both user and country against watchlist
    const watchlistMatches = await prisma.watchlist.findMany({
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

    const flagged = watchlistMatches.length > 0;
    const reasons = watchlistMatches.map(match => 
      `Watchlist match: ${match.type} (${match.value}) - ${match.description || match.risk_level} risk`
    );

    return {
      flagged,
      reasons
    };
  } catch (error) {
    logger.error({
      message: "Error checking watchlist",
      error,
      transactionId: transaction.transaction_id
    });
    
    // Return safe default if watchlist check fails
    return {
      flagged: false,
      reasons: []
    };
  }
}

module.exports = {
  checkWatchlist
};
