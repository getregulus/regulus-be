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
 *         channels:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Channel'
 *           description: Integration channels configured for this organization
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
 *           example: "High Value Transactions"
 *         field:
 *           type: string
 *           enum: [amount, currency, country, user_id, transaction_id]
 *           example: "amount"
 *         operator:
 *           type: string
 *           enum: [GREATER_THAN, LESS_THAN, GREATER_THAN_OR_EQUAL, LESS_THAN_OR_EQUAL, EQUAL, NOT_EQUAL, IN]
 *           example: "GREATER_THAN"
 *         value:
 *           type: string
 *           example: "100000"
 *         organizationId:
 *           type: integer
 *         subscriptions:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Subscription'
 *           description: Channel subscriptions for this rule
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
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
 *     Channel:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         channelId:
 *           type: string
 *           example: "chn_abc123"
 *         channelType:
 *           type: string
 *           enum: [slack, webhook, email, teams]
 *           example: "slack"
 *         name:
 *           type: string
 *           example: "Engineering Alerts"
 *         config:
 *           type: object
 *           example: { "webhookUrl": "https://hooks.slack.com/services/..." }
 *         status:
 *           type: string
 *           enum: [active, inactive]
 *           example: "active"
 *         organizationId:
 *           type: integer
 *         subscriptions:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               ruleId:
 *                 type: integer
 *               enabled:
 *                 type: boolean
 *               ruleName:
 *                 type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     Subscription:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         channelId:
 *           type: integer
 *         ruleId:
 *           type: integer
 *         enabled:
 *           type: boolean
 *           example: true
 *           description: Whether this subscription is active
 *         channel:
 *           $ref: '#/components/schemas/Channel'
 *         rule:
 *           $ref: '#/components/schemas/Rule'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 */