const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const prisma = require("@utils/prisma");
const logger = require("@utils/logger");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

exports.googleRegister = async (req, res) => {
  const { idToken } = req.body;

  logger.info("Google registration initiated.");

  try {
    // Verify the Google ID Token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;

    logger.info(`Google ID Token verified. User: ${email}`);

    // Check if the user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      logger.info(`User already exists: ${email}`);
      return res
        .status(409)
        .json({ error: "User already exists. Please login instead." });
    }

    // Create a new user
    const user = await prisma.user.create({
      data: { 
        email, 
        name, 
        googleId, 
        role: "admin"
      },
    });

    logger.info(`User created successfully. ID: ${user.id}`);

    // Generate a JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION }
    );

    logger.info(`JWT generated successfully for user: ${email}`);
    res.status(201).json({ token });
  } catch (error) {
    logger.error(`Google registration failed: ${error.message}`);
    res.status(401).json({ error: "Unauthorized" });
  }
};

exports.googleLogin = async (req, res) => {
  const { idToken } = req.body;

  logger.info("Google login initiated.");

  try {
    // Verify the Google ID Token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email } = payload;

    logger.info(`Google ID Token verified. User: ${email}`);

    // Check if the user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      logger.info(`User not found: ${email}`);
      return res
        .status(404)
        .json({ error: "User not found. Please register first." });
    }

    // Generate a JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION }
    );

    logger.info(`JWT generated successfully for user: ${email}`);
    res.status(200).json({ token });
  } catch (error) {
    logger.error(`Google login failed: ${error.message}`);
    res.status(401).json({ error: "Unauthorized" });
  }
};
