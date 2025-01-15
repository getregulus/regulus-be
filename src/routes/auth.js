const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("@middleware/auth");
const { login, register, getMe, updateMe } = require("@controllers/authController");
const {
  googleRegister,
  googleLogin,
} = require("@controllers/googleAuthController");

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *                 description: Full name of the user
 *               email:
 *                 type: string
 *                 example: "john.doe@example.com"
 *                 description: Email address of the user
 *               password:
 *                 type: string
 *                 example: "password123"
 *                 description: Password for the new account
 *     responses:
 *       201:
 *         description: User registered successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: "your-jwt-token"
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     name:
 *                       type: string
 *                       example: "John Doe"
 *                     email:
 *                       type: string
 *                       example: "john.doe@example.com"
 *       400:
 *         description: Validation error or missing fields.
 *       500:
 *         description: Internal server error.
 */
router.post("/register", register);

/**
 * @swagger
 * /auth/register/admin:
 *   post:
 *     summary: Register a new user as admin
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
 *                 example: "admin_user"
 *                 description: The username for the new user
 *               password:
 *                 type: string
 *                 example: "admin123"
 *                 description: The password for the new user
 *               role:
 *                 type: string
 *                 example: "admin"
 *                 description: Role of the user (e.g., "admin", "auditor")
 *     responses:
 *       201:
 *         description: User registered successfully.
 *       401:
 *         description: Unauthorized. No token provided or invalid token.
 *       403:
 *         description: Forbidden. The user is not authorized to perform this action.
 *       500:
 *         description: Internal server error.
 */
router.post("/register/admin", authenticate, authorize(["admin"]), register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Log in an existing user
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: "existing_user"
 *                 description: The username of the user
 *               password:
 *                 type: string
 *                 example: "password123"
 *                 description: The password of the user
 *     responses:
 *       200:
 *         description: Login successful. Returns a JWT token and user data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: "your-jwt-token"
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     username:
 *                       type: string
 *                       example: "existing_user"
 *                     role:
 *                       type: string
 *                       example: "auditor"
 *       401:
 *         description: Unauthorized. Invalid credentials provided.
 *       500:
 *         description: Internal server error.
 */
router.post("/login", login);

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
router.get("/me", authenticate, getMe);

/**
 * @swagger
 * /auth/me:
 *   put:
 *     summary: Update authenticated user details
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
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 example: "john@example.com"
 *               preferences:
 *                 type: object
 *                 properties:
 *                   notifications:
 *                     type: object
 *                     properties:
 *                       email:
 *                         type: boolean
 *               twoFactorEnabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Email already exists
 *       500:
 *         description: Internal server error
 */
router.put("/me", authenticate, updateMe);

module.exports = router;
