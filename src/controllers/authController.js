const prisma = require("@utils/prisma");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const logger = require("@utils/logger");
const { createResponse } = require("@utils/responseHandler");
const Joi = require("joi");
const { AuthenticationError, ValidationError } = require("@utils/errors");

// Validation schemas
const registerSchema = Joi.object({
  name: Joi.string().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid("admin", "auditor").optional(),
});

const updateUserSchema = Joi.object({
  name: Joi.string().min(3).max(50),
  email: Joi.string().email(),
  preferences: Joi.object({
    notifications: Joi.object({
      email: Joi.boolean(),
    }),
  }),
  twoFactorEnabled: Joi.boolean(),
}).min(1);

// User login
const login = async (req) => {
  const { email, password } = req.body;

  try {
    logger.info({
      message: "Login attempt",
      requestId: req.requestId,
    });

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      logger.warn({
        message: "Login failed - user not found",
        email,
        requestId: req.requestId,
      });
      throw new AuthenticationError("Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      logger.warn({
        message: "Login failed - invalid credentials",
        email,
        requestId: req.requestId,
      });
      throw new AuthenticationError("Invalid credentials");
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION || "1h" }
    );

    logger.info({
      message: "Login successful",
      userId: user.id,
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
      message: "Error occurred",
      request: {
        id: req.requestId,
        method: req.method,
        path: req.path,
        query: req.query,
        body: req.body,
      },
      error,
    });
    throw error;
  }
};

// User registration
const register = async (req) => {
  const { error } = registerSchema.validate(req.body);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  const { email, password, name, role = "admin" } = req.body;

  try {
    logger.info({
      message: "Registration attempt",
      requestId: req.requestId,
    });

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      logger.info({
        message: "Registration failed - email already exists",
        email,
        requestId: req.requestId,
      });
      throw new AuthenticationError("User already exists");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
      },
    });

    logger.info({
      message: "User registered successfully",
      userId: user.id,
      requestId: req.requestId,
    });

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION }
    );

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
      message: "Error occurred",
      request: {
        id: req.requestId,
        method: req.method,
        path: req.path,
        query: req.query,
        body: req.body,
      },
      error,
    });
    throw error;
  }
};

// Get user profile
const getMe = async (req) => {
  const {
    user: { id },
    requestId,
  } = req;

  logger.info({
    message: "Fetching user profile",
    userId: id,
    requestId,
  });

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      preferences: true,
      plan: true,
    },
  });

  if (!user) {
    logger.warn({
      message: "User not found",
      userId: id,
      requestId,
    });
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }

  const features = user.plan?.features ? JSON.parse(user.plan.features) : [];

  const formattedUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    preferences: {
      notifications: {
        email: user.preferences?.emailNotifications ?? true,
      },
    },
    plan: {
      type: user.plan?.type ?? "free",
      status: user.plan?.status ?? "active",
      expiry: user.plan?.expiryDate ?? null,
      features: features,
    },
    role: user.role,
    accountCreated: user.createdAt,
    twoFactorEnabled: user.twoFactorEnabled ?? false,
  };

  logger.info({
    message: "User profile fetched",
    userId: id,
    requestId,
  });

  return createResponse(true, { user: formattedUser });
};

// Update user profile
const updateMe = async (req) => {
  const {
    user: { id },
    body,
    requestId,
  } = req;

  const { error } = updateUserSchema.validate(body);
  if (error) {
    const err = new Error(error.details[0].message);
    err.name = "ValidationError";
    throw err;
  }

  logger.info({
    message: "Updating user profile",
    userId: id,
    requestId,
  });

  const { name, email, preferences, twoFactorEnabled } = body;

  const updateData = {};
  if (name) updateData.name = name;
  if (email) updateData.email = email;
  if (twoFactorEnabled !== undefined)
    updateData.twoFactorEnabled = twoFactorEnabled;

  const updatedUser = await prisma.$transaction(async (prisma) => {
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        preferences: true,
        plan: true,
      },
    });

    if (preferences?.notifications) {
      await prisma.preferences.upsert({
        where: { userId: id },
        create: {
          userId: id,
          emailNotifications: preferences.notifications.email,
        },
        update: {
          emailNotifications: preferences.notifications.email,
        },
      });
    }

    return user;
  });

  const features = updatedUser.plan?.features
    ? JSON.parse(updatedUser.plan.features)
    : [];

  const formattedUser = {
    id: updatedUser.id,
    email: updatedUser.email,
    name: updatedUser.name,
    preferences: {
      notifications: {
        email: updatedUser.preferences?.emailNotifications ?? true,
      },
    },
    plan: {
      type: updatedUser.plan?.type ?? "free",
      status: updatedUser.plan?.status ?? "active",
      expiry: updatedUser.plan?.expiryDate ?? null,
      features: features,
    },
    role: updatedUser.role,
    accountCreated: updatedUser.createdAt,
    twoFactorEnabled: updatedUser.twoFactorEnabled ?? false,
  };

  logger.info({
    message: "User profile updated",
    userId: id,
    requestId,
  });

  return createResponse(true, { user: formattedUser });
};

module.exports = {
  login,
  register,
  getMe,
  updateMe,
};
