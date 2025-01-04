const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("@middleware/auth");
const { login, register } = require("@controllers/authController");

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: User login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: admin_user
 *               password:
 *                 type: string
 *                 example: admin_password
 *     responses:
 *       200:
 *         description: Login successful.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: "your.jwt.token"
 *       401:
 *         description: Invalid credentials.
 */
router.post("/login", login);

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: User registration (Admin Only)
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: new_admin
 *               password:
 *                 type: string
 *                 example: admin_password
 *               role:
 *                 type: string
 *                 enum:
 *                   - admin
 *                   - auditor
 *                 example: admin
 *     responses:
 *       201:
 *         description: User registered successfully.
 *       400:
 *         description: Validation error.
 *       403:
 *         description: Access forbidden. Insufficient privileges.
 *       500:
 *         description: Internal server error.
 */
router.post("/register", authenticate, authorize(["admin"]), register);

module.exports = router;
