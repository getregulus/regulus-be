const db = require("@models/db");

const checkWatchlist = async (transaction) => {
  const { rows: watchlist } = await db.query("SELECT * FROM watchlist");

  const flaggedReasons = [];

  for (const item of watchlist) {
    if (item.type === "user" && item.value === transaction.user_id) {
      flaggedReasons.push(`User ${transaction.user_id} is on the watchlist.`);
    }
    if (item.type === "country" && item.value === transaction.country) {
      flaggedReasons.push(
        `Country ${transaction.country} is on the watchlist.`
      );
    }
    // Add more checks as needed
  }

  return {
    flagged: flaggedReasons.length > 0,
    reasons: flaggedReasons,
  };
};

module.exports = { checkWatchlist };
