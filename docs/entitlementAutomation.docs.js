/**
 * @swagger
 * components:
 *   securitySchemes:
 *     automationApiKey:
 *       type: apiKey
 *       in: header
 *       name: x-api-key
 *       description: ENTITLEMENT_AUTOMATION_API_KEY (preferred). Bearer also accepted.
 *   schemas:
 *     EntitlementSyncRequest:
 *       type: object
 *       required:
 *         - order_number
 *         - platform
 *         - quantity
 *         - product_name
 *       properties:
 *         order_number:
 *           type: string
 *           example: "702-6674459-9272258"
 *         customer_name:
 *           type: string
 *           example: "Sarah"
 *         customer_email:
 *           type: string
 *           nullable: true
 *           description: Required for Shopify. Omit/null for Amazon until /match.
 *         assigned_to:
 *           type: string
 *           nullable: true
 *           description: Defaults to customer_email for Shopify. Omit/null for Amazon.
 *         platform:
 *           type: string
 *           example: "amazon"
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
 *           format: date-time
 *           description: Defaults to server current UTC instant if omitted
 *     EntitlementMatchRequest:
 *       type: object
 *       required:
 *         - order_suffix
 *         - customer_email
 *       properties:
 *         order_suffix:
 *           type: string
 *           description: Last 7 digits of Amazon order ID
 *           example: "9272258"
 *         customer_email:
 *           type: string
 *           format: email
 *           example: "customer@example.com"
 */

/**
 * @swagger
 * tags:
 *   name: Entitlement Automation
 *   description: Machine-to-machine APIs for Shopify/Amazon automation (x-api-key required)
 */

/**
 * @swagger
 * /api/v1/entitlements/sync:
 *   post:
 *     summary: Sync entitlements for an order (bulk create)
 *     description: |
 *       Creates N entitlement rows for order quantity.
 *       Idempotent by (platform, order_number, syncUnitIndex) — safe under webhook retries.
 *       Shopify — customer_email required; auto-redeems if user exists.
 *       Amazon — omit customer_email/assigned_to (stored as null). Do not send AMAZON_PENDING placeholders.
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
 *               summary: Amazon pending (no email)
 *               value:
 *                 order_number: "702-6674459-9272258"
 *                 customer_name: "Sarah"
 *                 platform: "amazon"
 *                 quantity: 3
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
 *     description: |
 *       Sets expiry_date on all matching rows.
 *       If expiry_date is omitted, uses the server's current UTC instant.
 *       Redeemed users are synced internally; integration does not send PRO fields.
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
 *     summary: Match Amazon order to customer email (Klaviyo)
 *     description: |
 *       Finds pending unredeemed Amazon entitlements whose orderNumber ends with order_suffix.
 *       Updates customerEmail and assignedTo on ALL rows for that one full order.
 *       Returns updated_count. Does NOT redeem or grant PRO.
 *       409 only when the suffix matches multiple distinct full order numbers.
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
 *         description: Matched and updated (updated_count may be > 1)
 *       404:
 *         description: No match
 *       409:
 *         description: Ambiguous — same suffix matches different Amazon orders
 *       401:
 *         description: Invalid API key
 */
