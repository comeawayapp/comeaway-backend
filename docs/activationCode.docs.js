/**
 * @swagger
 * components:
 *   schemas:
 *     ActivationCode:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated activation code ID
 *         code:
 *           type: string
 *           description: Activation code
 *         type:
 *           type: string
 *           description: Code type (e.g., 'premium', 'trial')
 *         isUsed:
 *           type: boolean
 *           description: Whether the code has been used
 *         usedBy:
 *           type: string
 *           description: User ID who used the code
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           description: Code expiration date
 */

/**
 * @swagger
 * tags:
 *   name: Activation Codes
 *   description: Activation code management endpoints
 */

/**
 * @swagger
 * /api/activation-codes/admin/activation-codes:
 *   post:
 *     summary: Create activation code (Admin only)
 *     tags: [Activation Codes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - type
 *             properties:
 *               code:
 *                 type: string
 *                 description: Activation code
 *               type:
 *                 type: string
 *                 description: Code type (e.g., 'premium', 'trial')
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 description: Code expiration date
 *     responses:
 *       201:
 *         description: Activation code created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 activationCode:
 *                   $ref: '#/components/schemas/ActivationCode'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/activation-codes/admin/activation-codes:
 *   get:
 *     summary: List all activation codes (Admin only)
 *     tags: [Activation Codes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Activation codes retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 activationCodes:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ActivationCode'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/activation-codes/activation-codes/redeem:
 *   post:
 *     summary: Redeem activation code
 *     tags: [Activation Codes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 description: Activation code to redeem
 *     responses:
 *       200:
 *         description: Code redeemed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *                   description: Updated user information
 *       400:
 *         description: Invalid or expired code
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */