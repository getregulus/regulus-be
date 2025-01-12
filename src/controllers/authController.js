const prisma = require("@utils/prisma");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const logger = require("@utils/logger");
const Joi = require("joi");

// Validation schema for user registration
const registerSchema = Joi.object({
  username: Joi.string().min(3).max(50).required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid("admin", "auditor").required(),
});

// User login
exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    logger.info(`Login attempt for username: ${username}`);

    // Fetch user from the database
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      logger.warn(`Invalid login: username ${username} not found`);
      return res.status(401).json({ error: "Invalid username or password." });
    }

    // Compare passwords
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      logger.warn(`Invalid login: incorrect password for username ${username}`);
      return res.status(401).json({ error: "Invalid username or password." });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION || "1h" }
    );

    logger.info(`Login successful for username: ${username}`);
    res.status(200).json({ token });
  } catch (error) {
    logger.error(`Error logging in for username ${username}: ${error.message}`);
    res.status(500).json({ error: "Internal server error." });
  }
};

// User registration
exports.register = async (req, res) => {
  const { username, password, role } = req.body;

  // Validate input
  const { error } = registerSchema.validate(req.body);
  if (error) {
    logger.warn(
      `Validation error during registration: ${error.details[0].message}`
    );
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role,
      },
    });

    logger.info(`User registered: ${username} with role ${role}`);
    res.status(201).json({ message: "User registered successfully." });
  } catch (error) {
    logger.error(`Error registering user ${username}: ${error.message}`);
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
    res.status(500).json({ error: "Internal server error" });
  }
};
