const prisma = require("@utils/prisma");
const logger = require("@utils/logger");
const { createResponse } = require("@utils/responseHandler");
const Joi = require("joi");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

// Validation schemas
const createOrgSchema = Joi.object({
  name: Joi.string().required().min(3).max(100),
});

const addMemberSchema = Joi.object({
  userId: Joi.number().required(),
  role: Joi.string().valid("admin", "auditor").required(),
});

exports.createOrganization = async (req) => {
  const {
    body,
    user: { id },
    requestId,
  } = req;

  const { error } = createOrgSchema.validate(body);
  if (error) {
    const err = new Error(error.details[0].message);
    err.name = "ValidationError";
    throw err;
  }

  logger.info({
    message: "Creating organization",
    name: body.name,
    userId: id,
    requestId,
  });

  const organization = await prisma.organization.create({
    data: {
      name: body.name,
      members: {
        create: {
          userId: id,
          role: "admin",
        },
      },
    },
  });

  logger.info({
    message: "Organization created successfully",
    organizationId: organization.id,
    requestId,
  });

  return createResponse(true, organization);
};

exports.getOrganizations = async (req) => {
  const {
    user: { id: userId },
  } = req;

  try {
    logger.info({
      message: "Fetching organizations",
      userId,
      requestId: req.requestId,
    });

    const organizations = await prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: true,
      },
    });

    return createResponse(true, {
      organizations: organizations.map((member) => ({
        ...member.organization,
        role: member.role,
      })),
    });
  } catch (error) {
    logger.error({
      message: "Error fetching organizations",
      userId,
      requestId: req.requestId,
      error,
    });
    throw error;
  }
};

exports.addMember = async (req, organizationId) => {
  const { body, requestId } = req;

  // Validate the request body against the addMemberSchema
  const { error } = addMemberSchema.validate(body);
  if (error) {
    logger.warn({
      message: "Validation error while adding member",
      error: error.details[0].message,
      requestId,
    });
    throw new Error(error.details[0].message);
  }

  const { userId, role } = body;

  try {
    logger.info({
      message: "Adding member to organization",
      organizationId,
      userId,
      role,
      requestId,
    });

    // Check if member already exists
    const existingMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: parseInt(organizationId),
          userId: parseInt(userId),
        },
      },
    });

    if (existingMember) {
      logger.warn({
        message: "Member already exists in organization",
        organizationId,
        userId,
        requestId,
      });
      const err = new Error("User is already a member of this organization");
      err.status = 409;
      throw err;
    }

    const member = await prisma.organizationMember.create({
      data: {
        userId: parseInt(userId),
        organizationId: parseInt(organizationId),
        role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    logger.info({
      message: "Member added successfully",
      organizationId,
      userId,
      role,
      requestId,
    });

    return createResponse(true, member);
  } catch (error) {
    logger.error({
      message: "Error adding member",
      organizationId,
      userId,
      role,
      requestId,
      error,
    });
    throw error;
  }
};

exports.getMembers = async (req, organizationId) => {
  const { requestId } = req;

  logger.info({
    message: "Fetching organization members",
    organizationId,
    requestId,
  });

  const members = await prisma.organizationMember.findMany({
    where: { organizationId: parseInt(organizationId) },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  logger.info({
    message: `Fetched ${members.length} members`,
    organizationId,
    requestId,
  });

  return createResponse(true, members);
};

exports.removeMember = async (req, organizationId, userId) => {
  const { requestId } = req;

  logger.info({
    message: "Removing member from organization",
    organizationId,
    userId,
    requestId,
  });

  await prisma.organizationMember.delete({
    where: {
      organizationId_userId: {
        organizationId: parseInt(organizationId),
        userId: parseInt(userId),
      },
    },
  });

  logger.info({
    message: "Member removed successfully",
    organizationId,
    userId,
    requestId,
  });

  return createResponse(true, { message: "Member removed successfully" });
};

exports.generateApiKey = async (req, organizationId) => {
  const { requestId } = req;

  // Validate user
  if (!req.user || !req.user.id) {
    logger.error({
      message: "User not authenticated",
      requestId,
    });
    const err = new Error("User not authenticated");
    err.status = 401;
    throw err;
  }
  const userId = req.user.id;

  // Validate organization ID
  if (isNaN(parseInt(organizationId, 10))) {
    logger.error({
      message: "Invalid organization ID",
      organizationId,
      userId,
      requestId,
    });
    const err = new Error("Invalid organization ID");
    err.status = 400;
    throw err;
  }

  logger.info({
    message: "Generating API key",
    organizationId,
    userId,
    requestId,
  });

  // Check user permissions
  const membership = await prisma.organizationMember.findFirst({
    where: { organizationId: parseInt(organizationId, 10), userId },
  });

  if (!membership || membership.role !== "admin") {
    logger.warn({
      message: "Permission denied",
      organizationId,
      userId,
      requestId,
    });
    const err = new Error("Permission denied");
    err.status = 403;
    throw err;
  }

  // Check the number of existing API keys
  const existingKeys = await prisma.apiKey.count({
    where: { organizationId: parseInt(organizationId, 10) },
  });

  if (existingKeys >= 10) {
    const err = new Error("Maximum number of API keys reached for this organization");
    err.status = 409; // Conflict
    throw err;
  }

  // Generate API key
  const payload = {
    organizationId: parseInt(organizationId, 10),
    createdBy: userId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const apiKey = jwt.sign(payload, process.env.API_KEY_SECRET, { algorithm: "HS256" });

  // Hash the API key before storing it
  const hashedKey = await bcrypt.hash(apiKey, 10);

  // Save metadata to database
  try {
    await prisma.apiKey.create({
      data: {
        key: hashedKey,
        organizationId: parseInt(organizationId, 10),
        createdBy: userId,
        expiresAt: payload.expiresAt,
      },
    });
  } catch (error) {
    logger.error({
      message: "Error saving API key to database",
      organizationId,
      userId,
      requestId,
      error,
    });
    throw new Error("Failed to save API key");
  }

  logger.info({
    message: "API key generated successfully",
    organizationId,
    userId,
    requestId,
  });

  return {
    apiKey,
    expiresAt: payload.expiresAt,
  };
};

exports.getApiKey = async (req, organizationId) => {
  const { requestId } = req;

  logger.info({
    message: "Fetching API keys",
    organizationId,
    requestId,
  });

  const apiKeys = await prisma.apiKey.findMany({
    where: { organizationId: parseInt(organizationId) },
  });

  if (!apiKeys || apiKeys.length === 0) {
    const err = new Error("No API keys found for this organization");
    err.status = 404;
    throw err;
  }

  logger.info({
    message: "API keys retrieved successfully",
    organizationId,
    requestId,
  });

  return createResponse(true, apiKeys);
};

exports.deleteApiKey = async (req, organizationId, keyId) => {
  const { requestId } = req;

  logger.info({
    message: "Deleting API key",
    organizationId,
    keyId,
    requestId,
  });

  const apiKey = await prisma.apiKey.delete({
    where: {
      id: keyId,
    },
  });

  logger.info({
    message: "API key deleted successfully",
    organizationId,
    keyId,
    requestId,
  });

  return createResponse(true, { message: "API key deleted successfully" });
};

exports.getOrganizationDetails = async (req, organizationId) => {
  const { requestId } = req;

  logger.info({
    message: "Fetching organization details",
    organizationId,
    requestId,
  });

  try {
    const organization = await prisma.organization.findUnique({
      where: { id: parseInt(organizationId) },
      include: {
        members: {
          select: {
            userId: true,
            role: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!organization) {
      const error = new Error("Organization not found");
      error.status = 404;
      throw error;
    }

    logger.info({
      message: "Organization details fetched successfully",
      organizationId,
      requestId,
    });

    return createResponse(true, organization);
  } catch (error) {
    logger.error({
      message: "Error fetching organization details",
      organizationId,
      requestId,
      error,
    });
    throw error;
  }
};

exports.updateOrganizationDetails = async (req, organizationId) => {
  const { body, requestId } = req;

  logger.info({
    message: "Updating organization details",
    organizationId,
    updates: body,
    requestId,
  });

  try {
    const updatedOrganization = await prisma.organization.update({
      where: { id: parseInt(organizationId) },
      data: body,
    });

    logger.info({
      message: "Organization updated successfully",
      organizationId,
      requestId,
    });

    return createResponse(true, updatedOrganization);
  } catch (error) {
    logger.error({
      message: "Error updating organization details",
      organizationId,
      updates: body,
      requestId,
      error,
    });
    throw error;
  }
};

exports.deleteOrganization = async (req, organizationId) => {
  const { requestId } = req;

  logger.info({
    message: "Deleting organization",
    organizationId,
    requestId,
  });

  try {
    await prisma.organization.delete({
      where: { id: parseInt(organizationId) },
    });

    logger.info({
      message: "Organization deleted successfully",
      organizationId,
      requestId,
    });

    return createResponse(true, { message: "Organization deleted successfully" });
  } catch (error) {
    logger.error({
      message: "Error deleting organization",
      organizationId,
      requestId,
      error,
    });
    throw error;
  }
};
