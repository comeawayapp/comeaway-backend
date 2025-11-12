/**
 * @swagger
 * components:
 *   schemas:
 *     Entitlement:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated entitlement ID
 *         entitlementId:
 *           type: string
 *           description: 6-digit entitlement ID (auto-generated)
 *         productName:
 *           type: string
 *           description: Name of the product
 *         orderNumber:
 *           type: string
 *           description: Associated order number
 *         customerName:
 *           type: string
 *           description: Customer's name (optional)
 *         customerEmail:
 *           type: string
 *           description: Customer's email address
 *         assignedTo:
 *           type: string
 *           description: Email of who gets the entitlement (buyer or gift recipient)
 *         platform:
 *           type: string
 *           enum: [shopify, amazon, google_play, apple_iap, stripe, other]
 *           description: Source of purchase
 *         expiryDate:
 *           type: string
 *           format: date-time
 *           description: Entitlement expiration date (auto-set to 5 years if not provided)
 *         redeemed:
 *           type: boolean
 *           description: Whether the entitlement has been redeemed
 *         redeemedBy:
 *           type: string
 *           description: User ID who redeemed the entitlement
 *         redeemedAt:
 *           type: string
 *           format: date-time
 *           description: When the entitlement was redeemed
 *         subscriptionExpiresAt:
 *           type: string
 *           format: date-time
 *           description: When the subscription expires
 *         accessEmailSentAt:
 *           type: string
 *           format: date-time
 *           description: When the access email was sent
 *         accessEmailSentTo:
 *           type: string
 *           description: Email address the access email was sent to
 *         notes:
 *           type: string
 *           description: Internal notes
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the entitlement was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the entitlement was last updated
 */

/**
 * @swagger
 * tags:
 *   name: Entitlements
 *   description: Entitlement management endpoints (Admin only)
 */

/**
 * @swagger
 * /api/entitlements/admin/entitlements:
 *   post:
 *     summary: Create entitlement (Admin only)
 *     tags: [Entitlements]
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
 *               - customerEmail
 *               - assignedTo
 *               - platform
 *             properties:
 *               productName:
 *                 type: string
 *                 description: Name of the product
 *               orderNumber:
 *                 type: string
 *                 description: Associated order number
 *               customerName:
 *                 type: string
 *                 description: Customer's name (optional)
 *               customerEmail:
 *                 type: string
 *                 description: Customer's email address
 *               assignedTo:
 *                 type: string
 *                 description: Email of who gets the entitlement (buyer or gift recipient)
 *               platform:
 *                 type: string
 *                 enum: [shopify, amazon, google_play, apple_iap, stripe, other]
 *                 description: Source of purchase
 *               expiryDate:
 *                 type: string
 *                 format: date-time
 *                 description: Entitlement expiration date (optional, defaults to 5 years)
 *               notes:
 *                 type: string
 *                 description: Internal notes (optional)
 *     responses:
 *       201:
 *         description: Entitlement created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Entitlement created successfully"
 *                 entitlement:
 *                   $ref: '#/components/schemas/Entitlement'
 *       400:
 *         description: Missing required fields or invalid platform
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/entitlements/admin/entitlements:
 *   get:
 *     summary: List all entitlements (Admin only)
 *     tags: [Entitlements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: entitlementId
 *         schema:
 *           type: string
 *         description: Search by Entitlement ID (case-insensitive partial match)
 *         example: "ACV45p"
 *       - in: query
 *         name: customerEmail
 *         schema:
 *           type: string
 *         description: Search by Customer Email (case-insensitive partial match)
 *         example: "gmail"
 *       - in: query
 *         name: assignedTo
 *         schema:
 *           type: string
 *         description: Search by Assigned To email (case-insensitive partial match)
 *         example: "user@example.com"
 *       - in: query
 *         name: platform
 *         schema:
 *           type: string
 *           enum: [shopify, amazon, google_play, apple_iap, stripe, other, All]
 *         description: Filter by platform (exact match, use "All" to show all)
 *         example: "shopify"
 *       - in: query
 *         name: redeemed
 *         schema:
 *           type: string
 *         description: Filter by redemption status (exact match, use "All" to show all)
 *         example: "false"
 *     responses:
 *       200:
 *         description: Entitlements retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Entitlement'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/entitlements/entitlements/redeem:
 *   post:
 *     summary: Redeem entitlement
 *     tags: [Entitlements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - entitlementId
 *             properties:
 *               entitlementId:
 *                 type: string
 *                 description: Entitlement ID to redeem
 *     responses:
 *       200:
 *         description: Entitlement redeemed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Subscription activated!"
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *                   description: When the subscription expires
 *       400:
 *         description: Invalid or expired entitlement
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Entitlement not assigned to this user
 *       404:
 *         description: Entitlement not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/entitlements/admin/entitlements/{id}:
 *   put:
 *     summary: Edit entitlement (Admin only)
 *     tags: [Entitlements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Entitlement ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productName:
 *                 type: string
 *               customerName:
 *                 type: string
 *               customerEmail:
 *                 type: string
 *               assignedTo:
 *                 type: string
 *               platform:
 *                 type: string
 *                 enum: [shopify, amazon, google_play, apple_iap, stripe, other]
 *               expiryDate:
 *                 type: string
 *                 format: date-time
 *               orderNumber:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Entitlement updated successfully
 *       400:
 *         description: Invalid data
 *       404:
 *         description: Entitlement not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/entitlements/admin/entitlements/{id}:
 *   delete:
 *     summary: Delete entitlement (Admin only)
 *     tags: [Entitlements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Entitlement ID
 *     responses:
 *       200:
 *         description: Entitlement deleted successfully
 *       400:
 *         description: Cannot delete redeemed entitlement
 *       404:
 *         description: Entitlement not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/entitlements/admin/entitlements/import:
 *   post:
 *     summary: Bulk import entitlements (Admin only)
 *     tags: [Entitlements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - entitlements
 *             properties:
 *               entitlements:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - productName
 *                     - orderNumber
 *                     - customerEmail
 *                     - platform
 *                   properties:
 *                     productName:
 *                       type: string
 *                     orderNumber:
 *                       type: string
 *                     customerName:
 *                       type: string
 *                     customerEmail:
 *                       type: string
 *                     assignedTo:
 *                       type: string
 *                     platform:
 *                       type: string
 *                       enum: [shopify, amazon, google_play, apple_iap, stripe, other]
 *                     expiryDate:
 *                       type: string
 *                       format: date-time
 *                     notes:
 *                       type: string
 *               quantity:
 *                 type: integer
 *                 description: Number of entitlements to create from the first entitlement (for bulk orders)
 *     responses:
 *       200:
 *         description: Import completed
 *       400:
 *         description: Invalid data
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/entitlements/admin/entitlements/generate-bulk:
 *   post:
 *     summary: Generate bulk entitlements (Admin only)
 *     tags: [Entitlements]
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
 *             properties:
 *               count:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 1000
 *                 description: Number of entitlements to generate
 *               productName:
 *                 type: string
 *               platform:
 *                 type: string
 *                 enum: [shopify, amazon, google_play, apple_iap, stripe, other]
 *               expiryDate:
 *                 type: string
 *                 format: date-time
 *                 description: Expiry date (optional, defaults to 5 years)
 *     responses:
 *       201:
 *         description: Entitlements generated successfully
 *       400:
 *         description: Invalid data
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/entitlements/admin/entitlements/send-to-user:
 *   post:
 *     summary: Send access email to user (Admin only)
 *     tags: [Entitlements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assignedTo
 *               - productName
 *             properties:
 *               assignedTo:
 *                 type: string
 *                 description: Email address to send access email to
 *               customerName:
 *                 type: string
 *                 description: Customer name (optional)
 *               productName:
 *                 type: string
 *                 description: Product name
 *     responses:
 *       200:
 *         description: Access email sent successfully
 *       400:
 *         description: Invalid email format
 *       404:
 *         description: No entitlements found for this email
 *       500:
 *         description: Server error
 */

