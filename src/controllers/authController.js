const prisma = require("@utils/prisma");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const logger = require("@utils/logger");
const Joi = require("joi");

// Validation schema for user registration
const registerSchema = Joi.object({
  name: Joi.string().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid("admin", "auditor").optional(),
});

// User login
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION || "1h" }
    );

    res.status(200).json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    logger.error(`Error during login: ${error.message}`);
    res.status(500).json({ error: "Internal server error." });
  }
};

// User registration
exports.register = async (req, res) => {
  // Validate request body
  const { error } = registerSchema.validate(req.body);
  if (error) {
    logger.warn(
      `Validation error during registration: ${error.details[0].message}`
    );
    return res.status(400).json({ error: error.details[0].message });
  }

  const { name, email, password, role } = req.body;

  try {
    // Check if the user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      logger.warn(`Attempt to register with an existing email: ${email}`);
      return res.status(409).json({ error: "User already exists." });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user - always set role to admin
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "admin", // Always set role to admin
      },
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION || "1h" }
    );

    logger.info(`User registered successfully: ${email}`);
    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error(`Error during registration: ${error.message}`);
    res.status(500).json({ error: "Internal server error." });
  }
};

exports.getMe = async (req, res) => {
  try {
    logger.info("Fetching user data for authenticated request.");

    const user = req.user;
    if (!user) {
      logger.warn("Unauthorized access attempt.");
      return res.status(401).json({ error: "Unauthorized" });
    }

    logger.info(`User data fetched successfully: ${user.email}`);
    res.status(200).json({ user });
  } catch (error) {
    logger.error(`Error fetching user data: ${error.message}`);
    res.status(500).json({ error: "Internal server error." });
  }
};
