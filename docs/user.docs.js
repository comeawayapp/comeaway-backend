/**
 * @swagger
 * components:
 *   schemas:
 *     UserManagement:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: User ID
 *         firstname:
 *           type: string
 *         lastname:
 *           type: string
 *         email:
 *           type: string
 *         role:
 *           type: string
 *         status:
 *           type: string
 *     
 *     UserWithType:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: User ID
 *         firstname:
 *           type: string
 *           description: User's first name
 *         lastname:
 *           type: string
 *           description: User's last name
 *         email:
 *           type: string
 *           description: User's email address
 *         role:
 *           type: string
 *           description: User's role
 *         status:
 *           type: string
 *           description: User's status (active/inactive)
 *         isPro:
 *           type: boolean
 *           description: Whether user has Pro access
 *         proExpiresAt:
 *           type: string
 *           format: date-time
 *           description: When Pro access expires
 *         activationMode:
 *           type: string
 *           enum: [code, card, null]
 *           description: How user got Pro access
 *         userType:
 *           type: string
 *           enum: [Standard, Pro]
 *           description: User type classification
 *         activationMethod:
 *           type: string
 *           enum: [code, card, None]
 *           description: Activation method used
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: User creation date
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update date
 */

/**
 * @swagger
 * tags:
 *   name: User Management
 *   description: User management endpoints
 */

/**
 * @swagger
 * /api/auth/all-user:
 *   get:
 *     summary: Get all users with search and filtering (Admin)
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Search query for firstname, lastname, or email (case-insensitive)
 *         example: "temitope"
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [standard, pro]
 *         description: Filter by user type
 *         example: "pro"
 *       - in: query
 *         name: activationMethod
 *         schema:
 *           type: string
 *           enum: [code, card, none]
 *         description: Filter by activation method
 *         example: "code"
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserWithType'
 *                 total:
 *                   type: number
 *                   description: Total number of users found
 *                 filters:
 *                   type: object
 *                   properties:
 *                     query:
 *                       type: string
 *                       nullable: true
 *                     type:
 *                       type: string
 *                       nullable: true
 *                     activationMethod:
 *                       type: string
 *                       nullable: true
 *       400:
 *         description: Invalid filter parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 allowedValues:
 *                   type: array
 *                   items:
 *                     type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 * 
 * /api/auth/soft-deleted-users:
 *   get:
 *     summary: Get soft-deleted users with search and filtering (Admin)
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Search query for firstname, lastname, or email (case-insensitive)
 *         example: "temitope"
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [standard, pro]
 *         description: Filter by user type
 *         example: "pro"
 *       - in: query
 *         name: activationMethod
 *         schema:
 *           type: string
 *           enum: [code, card, none]
 *         description: Filter by activation method
 *         example: "code"
 *     responses:
 *       200:
 *         description: Soft-deleted users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserWithType'
 *                 total:
 *                   type: number
 *                   description: Total number of soft-deleted users found
 *                 filters:
 *                   type: object
 *                   properties:
 *                     query:
 *                       type: string
 *                       nullable: true
 *                     type:
 *                       type: string
 *                       nullable: true
 *                     activationMethod:
 *                       type: string
 *                       nullable: true
 *       400:
 *         description: Invalid filter parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 allowedValues:
 *                   type: array
 *                   items:
 *                     type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */ 