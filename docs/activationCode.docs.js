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
 *           description: 6-digit activation code
 *         productName:
 *           type: string
 *           description: Name of the product being activated
 *         orderNumber:
 *           type: string
 *           description: Associated order number
 *         customerName:
 *           type: string
 *           description: Customer's name
 *         customerEmail:
 *           type: string
 *           description: Customer's email address
 *         phoneNumber:
 *           type: string
 *           description: Customer's phone number
 *         platform:
 *           type: string
 *           description: Platform information
 *         expiresIn:
 *           type: string
 *           format: date-time
 *           description: Code expiration date
 *         redeemed:
 *           type: boolean
 *           description: Whether the code has been redeemed
 *         redeemedBy:
 *           type: string
 *           description: User ID who redeemed the code
 *         redeemedAt:
 *           type: string
 *           format: date-time
 *           description: When the code was redeemed
 *         subscriptionExpiresAt:
 *           type: string
 *           format: date-time
 *           description: When the subscription expires
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the code was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the code was last updated
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
 *               - productName
 *               - orderNumber
 *               - customerName
 *               - customerEmail
 *               - phoneNumber
 *               - platform
 *               - expiresIn
 *             properties:
 *               code:
 *                 type: string
 *                 description: 6-digit activation code
 *               productName:
 *                 type: string
 *                 description: Name of the product being activated
 *               orderNumber:
 *                 type: string
 *                 description: Associated order number
 *               customerName:
 *                 type: string
 *                 description: Customer's name
 *               customerEmail:
 *                 type: string
 *                 description: Customer's email address
 *               phoneNumber:
 *                 type: string
 *                 description: Customer's phone number
 *               platform:
 *                 type: string
 *                 description: Platform information
 *               expiresIn:
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
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Search by Code (case-insensitive partial match)
 *         example: "123"
 *       - in: query
 *         name: customerName
 *         schema:
 *           type: string
 *         description: Search by Name (case-insensitive partial match)
 *         example: "john"
 *       - in: query
 *         name: customerEmail
 *         schema:
 *           type: string
 *         description: Search by Email (case-insensitive partial match)
 *         example: "gmail"
 *       - in: query
 *         name: platform
 *         schema:
 *           type: string
 *         description: Filter by platform (exact match, use "All" to show all)
 *         example: "ios"
 *       - in: query
 *         name: redeemed
 *         schema:
 *           type: string
 *         description: Filter by redemption status (exact match, use "All" to show all)
 *         example: "false"
 *       - in: query
 *         name: orderNumber
 *         schema:
 *           type: string
 *         description: Filter by order number (case-insensitive partial match)
 *         example: "ORD-001"
 *       - in: query
 *         name: phoneNumber
 *         schema:
 *           type: string
 *         description: Filter by phone number (case-insensitive partial match)
 *         example: "+1234567890"
 *       - in: query
 *         name: productName
 *         schema:
 *           type: string
 *         description: Filter by product name (case-insensitive partial match)
 *         example: "Premium Subscription"

 *       - in: query
 *         name: redeemedBy
 *         schema:
 *           type: string
 *         description: Filter by user ID who redeemed the code
 *         example: "507f1f77bcf86cd799439011"
 *       - in: query
 *         name: redeemedAt
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by redemption date
 *         example: "2025-08-04T17:40:58.659+00:00"

 *     responses:
 *       200:
 *         description: Activation codes retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ActivationCode'
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

/**
 * @swagger
 * /api/activation-codes/admin/activation-codes/{id}:
 *   delete:
 *     summary: Delete activation code (Admin only)
 *     tags: [Activation Codes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Activation code ID
 *     responses:
 *       200:
 *         description: Activation code deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Activation code deleted successfully."
 *       400:
 *         description: Cannot delete redeemed code
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Cannot delete redeemed activation code."
 *       404:
 *         description: Activation code not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Activation code not found."
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

/**
 * @swagger
 * /api/activation-codes/admin/activation-codes/import:
 *   post:
 *     summary: Bulk import activation codes (Admin only)
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
 *               - codes
 *             properties:
 *               codes:
 *                 type: array
 *                 description: Array of activation code objects
 *                 items:
 *                   type: object
 *                   required:
 *                     - code
 *                     - productName
 *                     - orderNumber
 *                     - customerName
 *                     - customerEmail
 *                     - phoneNumber
 *                     - platform
 *                     - expiresIn
 *                   properties:
 *                     code:
 *                       type: string
 *                       description: 6-digit activation code
 *                     productName:
 *                       type: string
 *                       description: Name of the product being activated
 *                     orderNumber:
 *                       type: string
 *                       description: Associated order number
 *                     customerName:
 *                       type: string
 *                       description: Customer's name
 *                     customerEmail:
 *                       type: string
 *                       description: Customer's email address
 *                     phoneNumber:
 *                       type: string
 *                       description: Customer's phone number
 *                     platform:
 *                       type: string
 *                       description: Platform information
 *                     expiresIn:
 *                       type: string
 *                       format: date-time
 *                       description: Code expiration date
 *     responses:
 *       200:
 *         description: Import completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Import completed. Created: 5, Errors: 2, Duplicates: 1"
 *                 results:
 *                   type: object
 *                   properties:
 *                     created:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ActivationCode'
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           code:
 *                             type: string
 *                           error:
 *                             type: string
 *                     duplicates:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           code:
 *                             type: string
 *                           error:
 *                             type: string
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Codes must be a non-empty array."
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