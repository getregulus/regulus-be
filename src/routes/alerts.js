const express = require("express");
const router = express.Router();
const { authenticate } = require("@middleware/auth");
const { organizationContext } = require("@middleware/organization");
const { getAlerts, createAlert, deleteAlert } = require("@controllers/alertController");

/**
 * @swagger
 * /alerts:
 *   get:
 *     summary: Get all alerts for an organization
 *     tags: [Alerts]
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
 *         description: List of alerts
 */
router.get("/", authenticate, organizationContext, async (req, res) => {
  try {
    const alerts = await getAlerts(req.organizationId);
    if (alerts.length === 0) {
      console.log("No alerts found for organization ID:", req.organizationId);
    } else {
      console.log("Fetched alerts:", alerts);
    }
    res.status(200).json({ success: true, alerts });
  } catch (error) {
    console.error("Error in fetching alerts:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /alerts:
 *   post:
 *     summary: Create a new alert
 *     tags: [Alerts]
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
 *               transaction_id:
 *                 type: string
 *               reason:
 *                 type: string
 *     responses:
 *       201:
 *         description: Alert created successfully.
 */
router.post("/", authenticate, organizationContext, async (req, res) => {
  const { transaction_id, reason } = req.body;

  if (!transaction_id || !reason) {
    return res
      .status(400)
      .json({ success: false, error: "Missing required fields." });
  }

  try {
    const alert = await createAlert(transaction_id, reason, req.organizationId);
    res.status(201).json({ 
      success: true, 
      message: "Alert created successfully!",
      alert 
    });
  } catch (error) {
    console.error("Error in creating alert:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /alerts/{id}:
 *   delete:
 *     summary: Delete an alert
 *     tags: [Alerts]
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
 *     responses:
 *       200:
 *         description: Alert deleted successfully.
 */
router.delete("/:id", authenticate, organizationContext, async (req, res) => {
  try {
    const { id } = req.params;
    await deleteAlert(id, req.organizationId);
    res.status(200).json({ 
      success: true, 
      message: "Alert deleted successfully!" 
    });
  } catch (error) {
    if (error.message === "Alert not found.") {
      return res.status(404).json({ 
        success: false, 
        message: "Alert not found." 
      });
    }
    console.error("Error in deleting alert:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
