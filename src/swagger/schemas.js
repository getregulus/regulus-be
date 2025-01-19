/**
 * @swagger
 * components:
 *   schemas:
 *     Success:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           description: Response data - structure varies by endpoint
 *
 *     Error:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         error:
 *           type: string
 *         data:
 *           type: null
 *
 *     Pagination:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           description: Total number of items
 *         limit:
 *           type: integer
 *           description: Items per page
 *         offset:
 *           type: integer
 *           description: Number of items skipped
 *         hasMore:
 *           type: boolean
 *           description: Whether more items exist
 *
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         role:
 *           type: string
 *           enum: [admin, auditor, member]
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *     Organization:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         status:
 *           type: string
 *           enum: [active, inactive]
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *     Transaction:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         transaction_id:
 *           type: string
 *         amount:
 *           type: number
 *         currency:
 *           type: string
 *         country:
 *           type: string
 *         timestamp:
 *           type: string
 *           format: date-time
 *         flagged:
 *           type: boolean
 *
 *     Alert:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         transaction_id:
 *           type: string
 *         reason:
 *           type: string
 *         flagged_at:
 *           type: string
 *           format: date-time
 *         transaction:
 *           $ref: '#/components/schemas/Transaction'
 *
 *     Rule:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         rule_name:
 *           type: string
 *         condition:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *
 *     WatchlistEntry:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         identifier:
 *           type: string
 *         category:
 *           type: string
 *           enum: [user, merchant, ip]
 *         risk:
 *           type: string
 *           enum: [low, medium, high]
 *         reason:
 *           type: string
 *         expires_at:
 *           type: string
 *           format: date-time
 *
 */