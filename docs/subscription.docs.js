/**
 * @swagger
 * components:
 *   schemas:
 *     Subscription:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated subscription ID
 *         userId:
 *           type: string
 *           description: User ID (automatically set from JWT token)
 *         customer:
 *           type: string
 *           description: Stripe customer ID
 *         name:
 *           type: string
 *           description: Customer name
 *         plan:
 *           type: string
 *           enum: [monthly, annual]
 *           description: Subscription plan type
 *         startDate:
 *           type: string
 *           format: date-time
 *           description: Subscription start date (auto-generated)
 *         endDate:
 *           type: string
 *           format: date-time
 *           description: Subscription end date (calculated based on plan)
 *         status:
 *           type: string
 *           enum: [active, inactive]
 *           description: Subscription status
 *       required:
 *         - userId
 *         - customer
 *         - name
 *         - plan
 *         - endDate
 *         - status
 */

/**
 * @swagger
 * tags:
 *   name: Subscriptions
 *   description: Subscription management endpoints
 */

/**
 * @swagger
 * /api/subscription/create-subscription:
 *   post:
 *     summary: Create a new subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - plan
 *               - customer
 *               - name
 *             properties:
 *               plan:
 *                 type: string
 *                 enum: [monthly, annual]
 *                 description: Subscription plan type (monthly or annual)
 *               customer:
 *                 type: string
 *                 description: Stripe customer ID
 *               name:
 *                 type: string
 *                 description: Customer name
 *     responses:
 *       201:
 *         description: Subscription created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Subscription created successfully"
 *                 subscription:
 *                   $ref: '#/components/schemas/Subscription'
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Validation error - Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "plan, customer, name, and userId are required"
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
 * /api/subscription/subscription-details/{userId}:
 *   get:
 *     summary: Get subscription details for a user
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Subscription details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 subscription:
 *                   $ref: '#/components/schemas/Subscription'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Subscription not found
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
 * /api/subscription/my-subscription:
 *   get:
 *     summary: Get current user's subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 subscription:
 *                   $ref: '#/components/schemas/Subscription'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Subscription not found
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
 * /api/subscription/admin/all-subscriptions:
 *   get:
 *     summary: Get all subscriptions (Admin only)
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All subscriptions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 subscriptions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Subscription'
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
 * /api/subscription/admin/check-expired:
 *   post:
 *     summary: Check and update expired subscriptions (Admin only)
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Expired subscriptions checked and updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 updatedCount:
 *                   type: number
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
 * /api/subscription/admin/create-subscription-for-user:
 *   post:
 *     summary: Admin - Create subscription for a user
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userEmail
 *               - plan
 *             properties:
 *               userEmail:
 *                 type: string
 *                 format: email
 *                 description: Email of the user to create subscription for
 *               plan:
 *                 type: string
 *                 enum: [monthly, annual]
 *                 description: Subscription plan type
 *               duration:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 12
 *                 default: 1
 *                 description: Number of months/years for the subscription
 *     responses:
 *       201:
 *         description: Subscription created successfully for user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 subscription:
 *                   $ref: '#/components/schemas/Subscription'
 *                 user:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *                     isPro:
 *                       type: boolean
 *                     proExpiresAt:
 *                       type: string
 *                       format: date-time
 *                 success:
 *                   type: boolean
 *       400:
 *         description: Bad request - validation error or user already has active subscription
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 error:
 *                   type: string
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     SubscriptionDetailsResponse:
 *       type: object
 *       properties:
 *         plan:
 *           type: string
 *           nullable: true
 *           enum: [monthly, annual, daily]
 *           example: monthly
 *         price:
 *           type: number
 *           nullable: true
 *           description: Amount in major currency units (from Payment, else Stripe)
 *           example: 2.99
 *         price_cents:
 *           type: integer
 *           nullable: true
 *           example: 299
 *         currency:
 *           type: string
 *           nullable: true
 *           example: usd
 *         start_date:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         end_date:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         status:
 *           type: string
 *           example: active
 *         cancel_at_period_end:
 *           type: boolean
 *         cancellation_reason:
 *           type: string
 *           nullable: true
 *         allow_2_days_reminder:
 *           type: boolean
 *           description: Opt-in for email ~2 days before period end
 *         subscription_id:
 *           type: string
 *     SubscriptionPreferencesRequest:
 *       type: object
 *       description: At least one of cancellation_reason or allow_2_days_reminder is required
 *       properties:
 *         cancellation_reason:
 *           type: string
 *           nullable: true
 *           example: Too expensive
 *         allow_2_days_reminder:
 *           type: boolean
 *           example: true
 */

/**
 * @swagger
 * /api/subscription/me/details:
 *   get:
 *     summary: Get current user's subscription details
 *     description: |
 *       Returns plan, price (latest successful Payment first, then Stripe price, else null),
 *       start/end dates, and reminder/cancellation preference fields.
 *       Requires an existing Subscription row (entitlement-only Pro is out of scope).
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubscriptionDetailsResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No subscription found for this user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 code:
 *                   type: string
 *                   example: SUBSCRIPTION_NOT_FOUND
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/subscription/me/preferences:
 *   put:
 *     summary: Update cancellation reason and/or 2-day reminder preference
 *     description: |
 *       Stores `cancellation_reason` and/or `allow_2_days_reminder` on the user's
 *       Subscription. Does **not** cancel Stripe or change cancel_at_period_end.
 *       At least one field is required.
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SubscriptionPreferencesRequest'
 *           examples:
 *             both:
 *               value:
 *                 cancellation_reason: Too expensive
 *                 allow_2_days_reminder: true
 *             reminderOnly:
 *               value:
 *                 allow_2_days_reminder: false
 *     responses:
 *       200:
 *         description: Preferences updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Subscription preferences updated
 *                 subscription_id:
 *                   type: string
 *                 cancellation_reason:
 *                   type: string
 *                   nullable: true
 *                 allow_2_days_reminder:
 *                   type: boolean
 *                 cancel_at_period_end:
 *                   type: boolean
 *                 status:
 *                   type: string
 *                 unchanged_cancel_state:
 *                   type: boolean
 *                   description: True when Stripe cancel fields were left unchanged
 *       400:
 *         description: Empty body or invalid field types
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No subscription found for this user
 *       500:
 *         description: Server error
 */
