const prisma = require("@utils/prisma");
const logger = require("@utils/logger");
const { createResponse } = require("@utils/responseHandler");
const Joi = require("joi");

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
