/**
 * @swagger
 * components:
 *   securitySchemes:
 *     automationApiKey:
 *       type: apiKey
 *       in: header
 *       name: x-api-key
 *       description: ENTITLEMENT_AUTOMATION_API_KEY (or Authorization Bearer)
 *   schemas:
 *     EntitlementSyncRequest:
 *       type: object
 *       required:
 *         - order_number
 *         - platform
 *         - quantity
 *         - product_name
 *         - customer_email
 *       properties:
 *         order_number:
 *           type: string
 *           example: "SH-12345"
 *         customer_name:
 *           type: string
 *           example: "John Doe"
 *         customer_email:
 *           type: string
 *           example: "john@example.com"
 *         assigned_to:
 *           type: string
 *           description: Defaults to customer_email if omitted
 *         platform:
 *           type: string
 *           example: "shopify"
 *         quantity:
 *           type: integer
 *           minimum: 1
 *           example: 3
 *         product_name:
 *           type: string
 *           example: "Comeaway Sleep Mask"
 *         expiry_date:
 *           type: string
 *           format: date
 *           example: "2030-12-31"
 *         notes:
 *           type: string
 *     EntitlementExpireRequest:
 *       type: object
 *       required:
 *         - order_number
 *       properties:
 *         order_number:
 *           type: string
 *           example: "SH-12345"
 *         expiry_date:
 *           type: string
 *           format: date
 *           description: Defaults to now if omitted
 *     EntitlementMatchRequest:
 *       type: object
 *       required:
 *         - order_suffix
 *         - customer_email
 *       properties:
 *         order_suffix:
 *           type: string
 *           description: Last 7 digits of Amazon order ID
 *           example: "1509009"
 *         customer_email:
 *           type: string
 *           format: email
 *           example: "sarah@real-email.com"
 *     EntitlementAutomationResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         order_number:
 *           type: string
 *         created:
 *           type: integer
 *         total:
 *           type: integer
 *         entitlements:
 *           type: array
 *           items:
 *             type: object
 */

/**
 * @swagger
 * tags:
 *   name: Entitlement Automation
 *   description: Machine-to-machine APIs for Shopify/Amazon order automation (API key required)
 */

/**
 * @swagger
 * /api/v1/entitlements/sync:
 *   post:
 *     summary: Sync entitlements for an order (bulk create)
 *     description: |
 *       Creates N entitlement rows for order quantity. Idempotent on webhook retry.
 *       Shopify — buyer email on customer_email and assigned_to; auto-redeems if user exists.
 *       Amazon — use AMAZON_PENDING_{order_number} placeholder until /match.
 *     tags: [Entitlement Automation]
 *     security:
 *       - automationApiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EntitlementSyncRequest'
 *           examples:
 *             shopify:
 *               summary: Shopify 3 masks
 *               value:
 *                 order_number: "SH-12345"
 *                 customer_name: "John Doe"
 *                 customer_email: "john@example.com"
 *                 platform: "shopify"
 *                 quantity: 3
 *                 product_name: "Comeaway Sleep Mask"
 *                 expiry_date: "2030-12-31"
 *             amazon:
 *               summary: Amazon pending
 *               value:
 *                 order_number: "701-8193101-1509009"
 *                 customer_name: "Sarah"
 *                 customer_email: "AMAZON_PENDING_701-8193101-1509009"
 *                 platform: "amazon"
 *                 quantity: 1
 *                 product_name: "Comeaway Sleep Mask"
 *     responses:
 *       201:
 *         description: Entitlements created
 *       200:
 *         description: Already synced (idempotent)
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid API key
 *       503:
 *         description: Automation not configured
 */

/**
 * @swagger
 * /api/v1/entitlements/expire:
 *   post:
 *     summary: Expire all entitlements for an order (refunds)
 *     description: Sets expiry_date on all matching rows; immediately downgrades redeemed users.
 *     tags: [Entitlement Automation]
 *     security:
 *       - automationApiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EntitlementExpireRequest'
 *           example:
 *             order_number: "SH-12345"
 *             expiry_date: "2026-08-01"
 *     responses:
 *       200:
 *         description: Entitlements expired
 *       404:
 *         description: No entitlements for order
 *       401:
 *         description: Invalid API key
 */

/**
 * @swagger
 * /api/v1/entitlements/match:
 *   post:
 *     summary: Match Amazon order to customer email (Klaviyo form)
 *     description: Finds unredeemed Amazon entitlement where orderNumber ends with order_suffix; updates emails and auto-redeems.
 *     tags: [Entitlement Automation]
 *     security:
 *       - automationApiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EntitlementMatchRequest'
 *     responses:
 *       200:
 *         description: Matched and updated
 *       404:
 *         description: No match
 *       409:
 *         description: Ambiguous match (multiple entitlements)
 *       401:
 *         description: Invalid API key
 */
