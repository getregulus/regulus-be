const prisma = require("@utils/prisma");
const logger = require("@utils/logger");
const { AuthorizationError } = require("@utils/errors");

async function organizationContext(req, res, next) {
  try {
    const organizationId = parseInt(
      req.headers["x-organization-id"] || req.params.id
    );
    
    if (!organizationId) {
      logger.warn({
        message: "Missing organization ID",
        requestId: req.requestId,
        userId: req.user?.id,
        path: req.path,
      });
      throw new Error("Organization ID is required.");
    }

    logger.info({
      message: "Checking organization access",
      organizationId,
      userId: req.user?.id,
      requestId: req.requestId,
    });

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        members: {
          where: { userId: req.user?.id },
        },
      },
    });

    if (!organization) {
      logger.warn({
        message: "Organization not found",
        organizationId,
        userId: req.user?.id,
        requestId: req.requestId,
      });
      throw new AuthorizationError("Organization not found");
    }

    if (!organization.members.length) {
      logger.warn({
        message: "User not a member of organization",
        organizationId,
        userId: req.user?.id,
        requestId: req.requestId,
      });
      throw new AuthorizationError("Not a member of this organization");
    }

    logger.info({
      message: "Organization access granted",
      organizationId,
      userId: req.user?.id,
      userRole: organization.members[0].role,
      requestId: req.requestId,
    });

    req.organization = organization;
    req.organizationRole = organization.members[0].role;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  organizationContext,
};
