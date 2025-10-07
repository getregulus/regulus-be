const prisma = require("@utils/prisma");
const logger = require("@utils/logger");
const { createResponse } = require("@utils/responseHandler");
const { logAudit } = require("@utils/auditLogger");
const Joi = require("joi");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { sendInvitationEmail } = require("@utils/emailService");

const defaultRules = require("@utils/defaultRules");

// Validation schemas
const createOrgSchema = Joi.object({
  name: Joi.string().required().min(3).max(100),
});

const addMemberSchema = Joi.object({
  userId: Joi.number(),
  email: Joi.string().email(),
  role: Joi.string().valid("admin", "auditor").required(),
}).xor("userId", "email");

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

  // Insert default rules
  await prisma.rule.createMany({
    data: defaultRules.map((rule) => ({
      ...rule,
      organizationId: organization.id,
    })),
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
  const { body, requestId, user: currentUser } = req;

  // Validate the request body against the addMemberSchema
  const { error } = addMemberSchema.validate(body);
  if (error) {
    logger.warn({
      message: "Validation error while adding member",
      error: error.details[0].message,
      requestId,
    });
    const err = new Error(error.details[0].message);
    err.status = 400;
    throw err;
  }

  const { userId, email, role } = body;
  const orgId = parseInt(organizationId);

  try {
    // Get organization details for email
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true },
    });

    if (!organization) {
      const err = new Error("Organization not found");
      err.status = 404;
      throw err;
    }

    // Case 1: Adding by userId
    if (userId) {
      logger.info({
        message: "Adding member to organization by userId",
        organizationId,
        userId,
        role,
        requestId,
      });

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: parseInt(userId) },
      });

      if (!user) {
        const err = new Error("User not found");
        err.status = 404;
        throw err;
      }

      // Check if member already exists (idempotent response)
      const existingMember = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: orgId,
            userId: parseInt(userId),
          },
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

      if (existingMember) {
        logger.info({
          message: "Member already exists in organization (idempotent)",
          organizationId,
          userId,
          requestId,
        });
        return createResponse(true, existingMember, "User is already a member");
      }

      // Create membership
      const member = await prisma.organizationMember.create({
        data: {
          userId: parseInt(userId),
          organizationId: orgId,
          role,
          status: "active",
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

      await logAudit(req, {
        action: `Added member ${member.user.email} with role ${role}`,
      });

      return createResponse(true, member);
    }

    // Case 2: Adding by email
    if (email) {
      logger.info({
        message: "Adding member to organization by email",
        organizationId,
        email,
        role,
        requestId,
      });

      // Check if user is already a member (idempotent)
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        const existingMember = await prisma.organizationMember.findUnique({
          where: {
            organizationId_userId: {
              organizationId: orgId,
              userId: existingUser.id,
            },
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

        if (existingMember) {
          logger.info({
            message: "Member already exists in organization (idempotent)",
            organizationId,
            email,
            requestId,
          });
          return createResponse(
            true,
            existingMember,
            "User is already a member"
          );
        }
      }

      // Create invitation (whether user exists or not)
      logger.info({
        message: "Creating invitation",
        organizationId,
        email,
        userExists: !!existingUser,
        role,
        requestId,
      });

      // Check if invitation already exists
      const existingInvitation = await prisma.organizationInvitation.findUnique(
        {
          where: {
            organizationId_email: {
              organizationId: orgId,
              email: email.toLowerCase(),
            },
          },
        }
      );

      let invitation;

      if (existingInvitation) {
        // If invitation is pending, return idempotent response
        if (existingInvitation.status === "pending") {
          logger.info({
            message: "Invitation already exists for this email (idempotent)",
            organizationId,
            email,
            requestId,
          });
          return createResponse(
            true,
            {
              email: existingInvitation.email,
              role: existingInvitation.role,
              status: "invited",
              invitedAt: existingInvitation.createdAt,
              expiresAt: existingInvitation.expiresAt,
            },
            "Invitation already sent"
          );
        }

        // If invitation was canceled, expired, or accepted (user was removed), update it with new token
        if (
          existingInvitation.status === "canceled" || 
          existingInvitation.status === "expired" || 
          existingInvitation.status === "accepted"
        ) {
          logger.info({
            message: "Re-inviting user with previously used invitation",
            organizationId,
            email,
            previousStatus: existingInvitation.status,
            requestId,
          });

          const token = crypto.randomBytes(32).toString("hex");
          const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

          invitation = await prisma.organizationInvitation.update({
            where: {
              id: existingInvitation.id,
            },
            data: {
              role,
              token,
              invitedBy: currentUser.id,
              expiresAt,
              status: "pending",
            },
          });
        }
      } else {
        // Generate invitation token
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // Create invitation record
        invitation = await prisma.organizationInvitation.create({
          data: {
            organizationId: orgId,
            email: email.toLowerCase(),
            role,
            token,
            invitedBy: currentUser.id,
            expiresAt,
            status: "pending",
          },
        });
      }

      // Send invitation email
      try {
        await sendInvitationEmail({
          to: email,
          organizationName: organization.name,
          inviterName: currentUser.name || currentUser.email,
          role,
          token: invitation.token,
        });

        logger.info({
          message: "Invitation created and email sent",
          organizationId,
          email,
          role,
          requestId,
        });
      } catch (emailError) {
        logger.error({
          message: "Failed to send invitation email",
          organizationId,
          email,
          error: emailError.message,
          requestId,
        });
        // Don't fail the request if email fails - invitation is still created
      }

      await logAudit(req, {
        action: `Sent invitation to ${email} with role ${role}`,
      });

      return createResponse(
        true,
        {
          email: invitation.email,
          role: invitation.role,
          status: "invited",
          invitedAt: invitation.createdAt,
          expiresAt: invitation.expiresAt,
        },
        "Invitation sent successfully"
      );
    }
  } catch (error) {
    logger.error({
      message: "Error adding member",
      organizationId,
      userId,
      email,
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
  const { requestId, user: currentUser } = req;
  const orgId = parseInt(organizationId);
  const targetUserId = parseInt(userId);

  logger.info({
    message: "Removing member from organization",
    organizationId: orgId,
    userId: targetUserId,
    requestingUser: currentUser.id,
    requestId,
  });

  try {
    // Use a transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Check if the target member exists and get their role
      const targetMember = await tx.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: orgId,
            userId: targetUserId,
          },
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

      if (!targetMember) {
        const err = new Error("Member not found in this organization");
        err.status = 404;
        throw err;
      }

      // 2. If the target is an admin, check if they're the last admin
      if (targetMember.role === "admin") {
        const adminCount = await tx.organizationMember.count({
          where: {
            organizationId: orgId,
            role: "admin",
            status: "active",
          },
        });

        logger.info({
          message: "Admin count check",
          organizationId: orgId,
          currentAdminCount: adminCount,
          targetUserId,
          requestId,
        });

        // Cannot remove the last admin
        if (adminCount <= 1) {
          const err = new Error(
            "Cannot remove the last admin from the organization. Please assign another admin before removing this user."
          );
          err.status = 409;
          err.code = "LAST_ADMIN_REMOVAL";
          throw err;
        }
      }

      // 3. Delete the member
      await tx.organizationMember.delete({
        where: {
          organizationId_userId: {
            organizationId: orgId,
            userId: targetUserId,
          },
        },
      });

      return targetMember;
    });

    logger.info({
      message: "Member removed successfully",
      organizationId: orgId,
      userId: targetUserId,
      removedUserEmail: result.user.email,
      removedUserRole: result.role,
      requestId,
    });

    // 4. Audit the deletion with detailed information
    const isSelfRemoval = currentUser.id === targetUserId;
    await logAudit(req, {
      action: `Removed ${isSelfRemoval ? "themselves" : `member ${result.user.email}`} (role: ${result.role}) from organization`,
    });

    return createResponse(true, {
      message: "Member removed successfully",
      removedUser: {
        id: result.user.id,
        email: result.user.email,
        role: result.role,
      },
    });
  } catch (error) {
    logger.error({
      message: "Error removing member",
      organizationId: orgId,
      userId: targetUserId,
      requestId,
      error: error.message,
      errorCode: error.code,
    });
    throw error;
  }
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

  // Authorization is handled by the authorize middleware based on organizationRole
  // No need for redundant checks here

  // Check the number of existing API keys
  const existingKeys = await prisma.apiKey.count({
    where: { organizationId: parseInt(organizationId, 10) },
  });

  if (existingKeys >= 10) {
    const err = new Error(
      "Maximum number of API keys reached for this organization"
    );
    err.status = 409; // Conflict
    throw err;
  }

  // Generate API key
  const payload = {
    organizationId: parseInt(organizationId, 10),
    createdBy: userId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(
      Date.now() + 6 * 30 * 24 * 60 * 60 * 1000
    ).toISOString(),
  };

  const apiKey = jwt.sign(payload, process.env.API_KEY_SECRET, {
    algorithm: "HS256",
  });

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

  try {
    const apiKeys = await prisma.apiKey.findMany({
      where: { organizationId: parseInt(organizationId) },
    });

    logger.info({
      message:
        apiKeys.length > 0
          ? "API keys retrieved successfully"
          : "No API keys found",
      organizationId,
      count: apiKeys.length,
      requestId,
    });

    return createResponse(true, apiKeys);
  } catch (error) {
    logger.error({
      message: "Error fetching API keys",
      organizationId,
      requestId,
      error: error.message,
    });
    throw error;
  }
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
            status: true,
            joinedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        invitations: {
          where: {
            status: "pending",
          },
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
            createdAt: true,
            expiresAt: true,
            inviter: {
              select: {
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

    return createResponse(true, {
      message: "Organization deleted successfully",
    });
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

exports.acceptInvitation = async (req) => {
  const { token } = req.body;
  const { requestId, user } = req;

  if (!token) {
    const err = new Error("Invitation token is required");
    err.status = 400;
    throw err;
  }

  logger.info({
    message: "Accepting organization invitation",
    token,
    userId: user?.id,
    requestId,
  });

  try {
    // Find the invitation
    const invitation = await prisma.organizationInvitation.findUnique({
      where: { token },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!invitation) {
      const err = new Error("Invalid invitation token");
      err.status = 404;
      throw err;
    }

    // Check if invitation was canceled
    if (invitation.status === "canceled") {
      const err = new Error(
        "This invitation has been canceled by an administrator"
      );
      err.status = 410; // Gone
      throw err;
    }

    // Check if invitation has expired
    if (new Date() > invitation.expiresAt) {
      await prisma.organizationInvitation.update({
        where: { id: invitation.id },
        data: { status: "expired" },
      });

      const err = new Error("Invitation has expired");
      err.status = 410; // Gone
      throw err;
    }

    // Check if invitation is already accepted
    if (invitation.status === "accepted") {
      const err = new Error("Invitation has already been accepted");
      err.status = 409;
      throw err;
    }

    // If user is authenticated, use their account
    let userId = user?.id;

    // If not authenticated or different email, handle accordingly
    if (!userId) {
      // User needs to be authenticated to accept invitation
      const err = new Error("Authentication required to accept invitation");
      err.status = 401;
      throw err;
    }

    // Get user's email to verify it matches the invitation
    const userAccount = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (userAccount.email.toLowerCase() !== invitation.email.toLowerCase()) {
      const err = new Error(
        "This invitation was sent to a different email address"
      );
      err.status = 403;
      throw err;
    }

    // Check if user is already a member
    const existingMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: invitation.organizationId,
          userId: userId,
        },
      },
    });

    if (existingMember) {
      // Update invitation status and return success (idempotent)
      await prisma.organizationInvitation.update({
        where: { id: invitation.id },
        data: { status: "accepted" },
      });

      logger.info({
        message: "User already a member (idempotent acceptance)",
        organizationId: invitation.organizationId,
        userId,
        requestId,
      });

      return createResponse(
        true,
        {
          organization: invitation.organization,
          member: existingMember,
        },
        "Already a member of this organization"
      );
    }

    // Log what we're about to create
    logger.info({
      message: "Creating membership from invitation",
      organizationId: invitation.organizationId,
      userId,
      invitationRole: invitation.role,
      invitationEmail: invitation.email,
      requestId,
    });

    // Create the membership
    const member = await prisma.organizationMember.create({
      data: {
        userId: userId,
        organizationId: invitation.organizationId,
        role: invitation.role,
        status: "active",
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

    // Log what was actually created
    logger.info({
      message: "Membership created",
      organizationId: invitation.organizationId,
      userId,
      createdRole: member.role,
      expectedRole: invitation.role,
      requestId,
    });

    // Update invitation status
    await prisma.organizationInvitation.update({
      where: { id: invitation.id },
      data: { status: "accepted" },
    });

    logger.info({
      message: "Invitation accepted successfully",
      organizationId: invitation.organizationId,
      userId,
      role: invitation.role,
      memberRole: member.role,
      requestId,
    });

    // Log audit (manual creation since req.organization is not available)
    try {
      await prisma.auditLog.create({
        data: {
          organizationId: invitation.organizationId,
          userId: userId,
          action: `Accepted invitation and joined as ${invitation.role}`,
          createdAt: new Date(),
        },
      });
    } catch (auditError) {
      logger.error({
        message: "Failed to create audit log for invitation acceptance",
        error: auditError.message,
        organizationId: invitation.organizationId,
        userId,
      });
    }

    return createResponse(true, {
      organization: invitation.organization,
      member,
    });
  } catch (error) {
    logger.error({
      message: "Error accepting invitation",
      token,
      userId: user?.id,
      requestId,
      error: error.message,
    });
    throw error;
  }
};

exports.getInvitationDetails = async (req) => {
  const { token } = req.query;
  const { requestId } = req;

  if (!token) {
    const err = new Error("Invitation token is required");
    err.status = 400;
    throw err;
  }

  try {
    const invitation = await prisma.organizationInvitation.findUnique({
      where: { token },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        inviter: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!invitation) {
      const err = new Error("Invalid invitation token");
      err.status = 404;
      throw err;
    }

    // Check if expired
    const isExpired = new Date() > invitation.expiresAt;
    const isCanceled = invitation.status === "canceled";

    logger.info({
      message: "Invitation details retrieved",
      token,
      organizationId: invitation.organizationId,
      status: invitation.status,
      isExpired,
      isCanceled,
      requestId,
    });

    return createResponse(true, {
      email: invitation.email,
      role: invitation.role,
      organization: invitation.organization,
      inviter: invitation.inviter,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      isExpired,
      isCanceled,
    });
  } catch (error) {
    logger.error({
      message: "Error getting invitation details",
      token,
      requestId,
      error: error.message,
    });
    throw error;
  }
};

exports.cancelInvitation = async (req, organizationId, invitationId) => {
  const { requestId } = req;

  logger.info({
    message: "Canceling organization invitation",
    organizationId,
    invitationId,
    requestId,
  });

  try {
    // Verify the invitation exists and belongs to this organization
    const invitation = await prisma.organizationInvitation.findFirst({
      where: {
        id: parseInt(invitationId),
        organizationId: parseInt(organizationId),
      },
    });

    if (!invitation) {
      const err = new Error("Invitation not found");
      err.status = 404;
      throw err;
    }

    // Update the invitation status to canceled instead of deleting
    await prisma.organizationInvitation.update({
      where: { id: parseInt(invitationId) },
      data: { status: "canceled" },
    });

    logger.info({
      message: "Invitation canceled successfully",
      organizationId,
      invitationId,
      requestId,
    });

    await logAudit(req, {
      action: `Canceled invitation for ${invitation.email}`,
    });

    return createResponse(true, {
      message: "Invitation canceled successfully",
    });
  } catch (error) {
    logger.error({
      message: "Error canceling invitation",
      organizationId,
      invitationId,
      requestId,
      error: error.message,
    });
    throw error;
  }
};
