const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('@middleware/auth');
const { organizationContext } = require('@middleware/organization');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * @swagger
 * /organizations:
 *   post:
 *     summary: Create a new organization
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "My Organization"
 *     responses:
 *       201:
 *         description: Organization created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: Server error
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { name } = req.body;
    
    const organization = await prisma.organization.create({
      data: {
        name,
        members: {
          create: {
            userId: req.user.id,
            role: 'admin'
          }
        }
      }
    });
    
    res.status(201).json(organization);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create organization' });
  }
});

/**
 * @swagger
 * /organizations:
 *   get:
 *     summary: Get all organizations for the authenticated user
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of organizations
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   role:
 *                     type: string
 *                     enum: [admin, member]
 *       500:
 *         description: Server error
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const organizations = await prisma.organizationMember.findMany({
      where: { userId: req.user.id },
      include: { organization: true }
    });
    
    res.json(organizations.map(mem => ({
      ...mem.organization,
      role: mem.role
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

/**
 * @swagger
 * /organizations/{id}/members:
 *   post:
 *     summary: Add a member to an organization
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Organization ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: integer
 *               role:
 *                 type: string
 *                 enum: [admin, member]
 *     responses:
 *       201:
 *         description: Member added successfully
 *       403:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.post('/:id/members', authenticate, organizationContext, authorize(['admin']), async (req, res) => {
  try {
    const { userId, role } = req.body;
    
    // Validate input
    if (!userId || !role) {
      return res.status(400).json({ 
        error: 'Both userId and role are required' 
      });
    }

    // Check if member already exists
    const existingMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: parseInt(req.params.id),
          userId: parseInt(userId)
        }
      }
    });

    if (existingMember) {
      return res.status(409).json({ 
        error: 'User is already a member of this organization' 
      });
    }

    const member = await prisma.organizationMember.create({
      data: {
        userId: parseInt(userId),
        organizationId: parseInt(req.params.id),
        role: role
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    res.status(201).json({
      success: true,
      member
    });
  } catch (error) {
    console.error('Error adding member:', error);
    if (error.code === 'P2003') {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }
    res.status(500).json({ 
      error: 'Failed to add member',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @swagger
 * /organizations/{id}/members:
 *   get:
 *     summary: Get all members of an organization
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Organization ID
 *     responses:
 *       200:
 *         description: List of organization members
 */
router.get('/:id/members', authenticate, organizationContext, async (req, res) => {
  try {
    const members = await prisma.organizationMember.findMany({
      where: { organizationId: parseInt(req.params.id) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

/**
 * @swagger
 * /organizations/{id}/members/{userId}:
 *   delete:
 *     summary: Remove a member from an organization
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Organization ID
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID to remove
 *     responses:
 *       200:
 *         description: Member removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       403:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.delete('/:id/members/:userId', authenticate, organizationContext, authorize(['admin']), async (req, res) => {
  try {
    await prisma.organizationMember.delete({
      where: {
        organizationId_userId: {
          organizationId: parseInt(req.params.id),
          userId: parseInt(req.params.userId)
        }
      }
    });
    
    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

module.exports = router; 