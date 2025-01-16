const express = require("express");
const router = express.Router();
const { authenticate } = require("@middleware/auth");
const { organizationContext } = require("@middleware/organization");
const {
  getAllWatchlistItems,
  addWatchlistItem,
  deleteWatchlistItem,
} = require("@models/watchlistModel");

/**
 * @swagger
 * /watchlist:
 *   get:
 *     summary: Get all watchlist items for an organization
 *     tags: [Watchlist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-organization-id
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization ID
 *     responses:
 *       200:
 *         description: List of watchlist items
 */
router.get("/", authenticate, organizationContext, async (req, res) => {
  try {
    const items = await getAllWatchlistItems(req.organizationId);
    res.status(200).json(items);
  } catch (error) {
    console.error("Error in fetching watchlist items:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /watchlist:
 *   post:
 *     summary: Add a new watchlist item
 *     tags: [Watchlist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-organization-id
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 example: country
 *               value:
 *                 type: string
 *                 example: US
 *     responses:
 *       201:
 *         description: Watchlist item added successfully.
 */
router.post("/", authenticate, organizationContext, async (req, res) => {
  const { type, value } = req.body;

  if (!type || !value) {
    return res
      .status(400)
      .json({ success: false, error: "Missing required fields." });
  }

  try {
    await addWatchlistItem(type, value, req.organizationId);
    res
      .status(201)
      .json({ success: true, message: "Watchlist item added successfully!" });
  } catch (error) {
    console.error("Error in adding watchlist item:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /watchlist/{id}:
 *   delete:
 *     summary: Delete a watchlist item
 *     tags: [Watchlist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-organization-id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the watchlist item to delete
 *     responses:
 *       200:
 *         description: Watchlist item deleted successfully.
 *       404:
 *         description: Watchlist item not found.
 */
router.delete("/:id", authenticate, organizationContext, async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await deleteWatchlistItem(id, req.organizationId);
    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Watchlist item not found." });
    }
    res
      .status(200)
      .json({ success: true, message: "Watchlist item deleted successfully!" });
  } catch (error) {
    console.error("Error in deleting watchlist item:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
