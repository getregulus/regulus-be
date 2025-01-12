const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("@middleware/auth");
const { login, register } = require("@controllers/authController");
const {
  googleRegister,
  googleLogin,
} = require("@controllers/googleAuthController");

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

/**
 * @swagger
 * /auth/google-register:
 *   post:
 *     summary: Register a new user with Google authentication
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               idToken:
 *                 type: string
 *                 example: "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
 *                 description: The ID token returned from Google's authentication process
 *     responses:
 *       201:
 *         description: Registration successful. Returns your app's JWT token.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: "your-jwt-token"
 *       409:
 *         description: Conflict. The user already exists.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "User already exists. Please login instead."
 *       401:
 *         description: Unauthorized. The provided Google ID token is invalid.
 *       500:
 *         description: Internal server error.
 */
router.post("/google-register", googleRegister);

/**
 * @swagger
 * /auth/google-login:
 *   post:
 *     summary: Log in an existing user with Google authentication
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               idToken:
 *                 type: string
 *                 example: "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
 *                 description: The ID token returned from Google's authentication process
 *     responses:
 *       200:
 *         description: Login successful. Returns your app's JWT token.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: "your-jwt-token"
 *       404:
 *         description: User not found. The user needs to register first.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "User not found. Please register first."
 *       401:
 *         description: Unauthorized. The provided Google ID token is invalid.
 *       500:
 *         description: Internal server error.
 */
router.post("/google-login", googleLogin);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Fetch authenticated user details
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved user details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     email:
 *                       type: string
 *                       example: "john@example.com"
 *                     name:
 *                       type: string
 *                       example: "John Doe"
 *       401:
 *         description: Unauthorized. The token is missing or invalid.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Unauthorized"
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Internal server error."
 */
router.get("/me", authenticate, (req, res) => {
  res.status(200).json({ user: req.user });
});

module.exports = router;
