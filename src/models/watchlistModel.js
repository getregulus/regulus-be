const db = require("./db");

// Fetch all watchlist items
const getAllWatchlistItems = async () => {
  const { rows } = await db.query(
    "SELECT * FROM watchlist ORDER BY added_at DESC"
  );
  return rows;
};

// Add a new item to the watchlist
const addWatchlistItem = async (type, value) => {
  await db.query("INSERT INTO watchlist (type, value) VALUES ($1, $2)", [
    type,
    value,
  ]);
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
