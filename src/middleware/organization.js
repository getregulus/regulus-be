const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const organizationContext = async (req, res, next) => {
  const organizationId = req.headers['x-organization-id'];

  if (!organizationId) {
    return res.status(400).json({ error: 'Organization ID is required' });
  }

  try {
    const membership = await prisma.organizationMember.findFirst({
      where: {
        organizationId: parseInt(organizationId),
        userId: req.user.id
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Access denied to this organization' });
    }

    req.organizationId = parseInt(organizationId);
    req.organizationRole = membership.role;
    next();
  } catch (error) {
    console.error('Organization context error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { organizationContext }; 