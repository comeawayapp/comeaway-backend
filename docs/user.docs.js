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
 */

/**
 * @swagger
 * tags:
 *   name: User Management
 *   description: User management endpoints
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (Admin)
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */ 