const db = require("./db");

// Fetch all watchlist items
const getAllWatchlistItems = async () => {
  const { rows } = await db.query(
    "SELECT * FROM watchlist ORDER BY added_at DESC"
  );
  return rows;
};

// Add a new item to the watchlist
const addWatchlistItem = async (type, value, organizationId) => {
  await db.query(
    "INSERT INTO watchlist (type, value, organizationid) VALUES ($1, $2, $3)",
    [type, value, organizationId]
  );
};

// Delete an item from the watchlist
const deleteWatchlistItem = async (id) => {
  const { rowCount } = await db.query("DELETE FROM watchlist WHERE id = $1", [
    id,
  ]);
  return rowCount > 0;
};

module.exports = {
  getAllWatchlistItems,
  addWatchlistItem,
  deleteWatchlistItem,
};
