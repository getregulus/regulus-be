const prisma = require("@utils/prisma");
const logger = require("@utils/logger");
const { AuthorizationError } = require("@utils/errors");

async function organizationContext(req, res, next) {
  try {
    const organizationId = parseInt(
      req.headers["x-organization-id"] || req.params.id
    );
    
    if (!organizationId || isNaN(organizationId)) {
      logger.warn({
        message: "Missing or invalid organization ID",
        requestId: req.requestId,
        userId: req.user?.id,
        path: req.path,
        rawOrgId: req.headers["x-organization-id"] || req.params.id,
      });
      throw new AuthorizationError("Valid organization ID is required");
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
          where: { 
            userId: req.user?.id,
            status: "active" 
          },
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

    if (organization.status !== "active") {
      logger.warn({
        message: "Organization is not active",
        organizationId,
        organizationStatus: organization.status,
        userId: req.user?.id,
        requestId: req.requestId,
      });
      throw new AuthorizationError("Organization is not active");
    }

    if (!organization.members.length) {
      logger.warn({
        message: "User not an active member of organization",
        organizationId,
        userId: req.user?.id,
        requestId: req.requestId,
      });
      throw new AuthorizationError("Not an active member of this organization");
    }

    const member = organization.members[0];
    
    logger.info({
      message: "Organization access granted",
      organizationId,
      organizationName: organization.name,
      userId: req.user?.id,
      memberRole: member.role,
      memberStatus: member.status,
      requestId: req.requestId,
    });

    req.organization = organization;
    req.organizationRole = member.role;
    req.organizationMember = member; 
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  organizationContext,
};
