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
 *           description: 6-digit activation code (auto-generated)
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
 *   description: Activation code management endpoints (Admin only)
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
 *               - productName
 *               - orderNumber
 *               - customerName
 *               - customerEmail
 *               - platform
 *               - expiresIn
 *             properties:
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
 *                   example: "Activation code created successfully"
 *                 activationCode:
 *                   $ref: '#/components/schemas/ActivationCode'
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
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
 *   put:
 *     summary: Edit activation code (Admin only)
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productName:
 *                 type: string
 *                 description: Name of the product being activated
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
 *                 description: Code expiration date (only for unredeemed codes)
 *     responses:
 *       200:
 *         description: Activation code updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Activation code updated successfully."
 *                 activationCode:
 *                   $ref: '#/components/schemas/ActivationCode'
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

/**
 * @swagger
 * /api/activation-codes/admin/activation-codes/generate-bulk:
 *   post:
 *     summary: Generate bulk activation codes (Admin only)
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
 *               - count
 *               - productName
 *               - platform
 *               - expiresIn
 *             properties:
 *               count:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 1000
 *                 description: Number of codes to generate
 *               productName:
 *                 type: string
 *                 description: Name of the product for the codes
 *               platform:
 *                 type: string
 *                 description: Platform information
 *               expiresIn:
 *                 type: string
 *                 format: date-time
 *                 description: Code expiration date
 *     responses:
 *       201:
 *         description: Bulk activation codes generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "100 activation codes generated successfully"
 *                 count:
 *                   type: integer
 *                   description: Number of codes generated
 *                 codes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Activation code ID
 *                       code:
 *                         type: string
 *                         description: Generated activation code
 *                       productName:
 *                         type: string
 *                         description: Product name
 *                       platform:
 *                         type: string
 *                         description: Platform
 *                       expiresIn:
 *                         type: string
 *                         format: date-time
 *                         description: Expiration date
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/activation-codes/admin/activation-codes/send-to-user:
 *   post:
 *     summary: Send access code to email address (Admin only)
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
 *               - customerEmail
 *               - productName
 *               - platform
 *               - expiresIn
 *             properties:
 *               customerEmail:
 *                 type: string
 *                 description: Email address to send the code to
 *               productName:
 *                 type: string
 *                 description: Name of the product for the code
 *               platform:
 *                 type: string
 *                 description: Platform information
 *               expiresIn:
 *                 type: string
 *                 format: date-time
 *                 description: Code expiration date
 *     responses:
 *       200:
 *         description: Access code sent successfully to user email
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Access code sent successfully to user email"
 *                 activationCode:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Activation code ID
 *                     code:
 *                       type: string
 *                       description: Generated 6-digit code
 *                     customerName:
 *                       type: string
 *                       description: User's full name
 *                     customerEmail:
 *                       type: string
 *                       description: User's email
 *                     productName:
 *                       type: string
 *                       description: Product name
 *                     platform:
 *                       type: string
 *                       description: Platform
 *                     expiresIn:
 *                       type: string
 *                       format: date-time
 *                       description: Expiration date
 *                 emailSent:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Missing required fields
 *       404:
 *         description: Not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error or email failure
 */