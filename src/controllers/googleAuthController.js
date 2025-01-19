const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const logger = require("@utils/logger");
const { createResponse } = require("@utils/responseHandler");
const { AuthenticationError } = require("@utils/errors");
const prisma = require("@utils/prisma");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function googleRegister(req) {
  const { idToken } = req.body;

  try {
    logger.info({
      message: "Google registration initiated",
      requestId: req.requestId,
    });

    // Verify the Google ID Token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;

    logger.info({
      message: "Google ID Token verified",
      email,
      requestId: req.requestId,
    });

    // Check if the user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      logger.info({
        message: "User already exists",
        email,
        requestId: req.requestId,
      });
      throw new AuthenticationError(
        "User already exists. Please login instead."
      );
    }

    // Create a new user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        googleId,
        role: "admin",
      },
    });

    logger.info({
      message: "User created successfully",
      userId: user.id,
      requestId: req.requestId,
    });

    // Generate a JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION }
    );

    logger.info({
      message: "JWT generated successfully",
      email,
      requestId: req.requestId,
    });

    return createResponse(true, { token });
  } catch (error) {
    logger.error({
      message: "Google registration failed",
      error: error.message,
      requestId: req.requestId,
    });
    throw error;
  }
}

async function googleLogin(req) {
  const { idToken } = req.body;

  try {
    logger.info({
      message: "Google login initiated",
      requestId: req.requestId,
    });

    // Verify the Google ID Token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email } = payload;

    logger.info({
      message: "Google ID Token verified",
      email,
      requestId: req.requestId,
    });

    // Check if the user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      logger.info({
        message: "User not found",
        email,
        requestId: req.requestId,
      });
      throw new AuthenticationError("User not found. Please register first.");
    }

    // Generate a JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION }
    );

    logger.info({
      message: "JWT generated successfully",
      email,
      requestId: req.requestId,
    });

    return createResponse(true, {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error({
      message: "Google login failed",
      error: error.message,
      requestId: req.requestId,
    });
    throw error;
  }
}

module.exports = {
  googleRegister,
  googleLogin,
};
