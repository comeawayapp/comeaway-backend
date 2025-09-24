/**
 * @swagger
 * tags:
 *   - name: Stripe Payments
 *     description: Stripe payment processing and management
 *   - name: Stripe Webhooks
 *     description: Stripe webhook event handling
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CheckoutSession:
 *       type: object
 *       properties:
 *         sessionId:
 *           type: string
 *           description: Stripe checkout session ID
 *         url:
 *           type: string
 *           description: Checkout URL for redirect
 *         success:
 *           type: boolean
 *           description: Session creation success status
 *     
 *     PaymentSheet:
 *       type: object
 *       properties:
 *         paymentIntent:
 *           type: string
 *           description: Payment intent client secret
 *         ephemeralKey:
 *           type: string
 *           description: Ephemeral key for mobile payments
 *         customer:
 *           type: string
 *           description: Stripe customer ID
 *         publishableKey:
 *           type: string
 *           description: Stripe publishable key
 *     
 *     PaymentStatus:
 *       type: object
 *       properties:
 *         paymentId:
 *           type: string
 *           description: Local payment ID
 *         status:
 *           type: string
 *           enum: [requires_payment_method, requires_confirmation, requires_action, processing, requires_capture, canceled, succeeded, failed]
 *           description: Payment status
 *         amount:
 *           type: string
 *           description: Formatted payment amount
 *         paidAt:
 *           type: string
 *           format: date-time
 *           description: Payment completion timestamp
 *         isSuccessful:
 *           type: boolean
 *           description: Whether payment was successful
 *     
 *     PaymentHistory:
 *       type: object
 *       properties:
 *         payments:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Payment'
 *         pagination:
 *           $ref: '#/components/schemas/Pagination'
 *     
 *     Payment:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Payment ID
 *         userId:
 *           type: string
 *           description: User ID
 *         amount:
 *           type: number
 *           description: Amount in cents
 *         currency:
 *           type: string
 *           description: Currency code
 *         status:
 *           type: string
 *           description: Payment status
 *         processingType:
 *           type: string
 *           enum: [subscription, one_time, setup, refund]
 *           description: Type of payment
 *         paidAt:
 *           type: string
 *           format: date-time
 *           description: Payment completion time
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Payment creation time
 *     
 *     WebhookEvent:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Event ID
 *         type:
 *           type: string
 *           description: Event type
 *         data:
 *           type: object
 *           description: Event data
 *         created:
 *           type: number
 *           description: Event creation timestamp
 *     
 *     Pagination:
 *       type: object
 *       properties:
 *         currentPage:
 *           type: number
 *           description: Current page number
 *         totalPages:
 *           type: number
 *           description: Total number of pages
 *         totalPayments:
 *           type: number
 *           description: Total number of items
 *         hasNext:
 *           type: boolean
 *           description: Whether there's a next page
 *         hasPrev:
 *           type: boolean
 *           description: Whether there's a previous page
 */

// ==================== STRIPE PAYMENTS ====================

/**
 * @swagger
 * /api/payments/create-checkout-session:
 *   post:
 *     tags: [Stripe Payments]
 *     summary: Create a checkout session for subscription
 *     description: Creates a Stripe checkout session for subscription payments with optional discounts
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - priceId
 *             properties:
 *               priceId:
 *                 type: string
 *                 description: Stripe price ID for subscription
 *                 example: "price_1234567890"
 *               successUrl:
 *                 type: string
 *                 description: Success redirect URL
 *                 example: "https://yourapp.com/success"
 *               cancelUrl:
 *                 type: string
 *                 description: Cancel redirect URL
 *                 example: "https://yourapp.com/cancel"
 *               couponCode:
 *                 type: string
 *                 description: Coupon code for discount
 *                 example: "SAVE20"
 *               promoCode:
 *                 type: string
 *                 description: Promotional code for discount
 *                 example: "SUMMER2024"
 *     responses:
 *       200:
 *         description: Checkout session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CheckoutSession'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User or price not found
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
 * /api/payments/payment-sheet:
 *   post:
 *     tags: [Stripe Payments]
 *     summary: Create payment sheet for mobile payments
 *     description: Creates payment sheet parameters for mobile app payments
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - priceId
 *               - userId
 *             properties:
 *               priceId:
 *                 type: string
 *                 description: Stripe price ID
 *                 example: "price_1234567890"
 *               userId:
 *                 type: string
 *                 description: User ID
 *                 example: "60f7b3b3b3b3b3b3b3b3b3b3"
 *     responses:
 *       200:
 *         description: Payment sheet created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentSheet'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User or price not found
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
 * /api/payments/status/{paymentIntentId}:
 *   get:
 *     tags: [Stripe Payments]
 *     summary: Get payment status
 *     description: Retrieves the current status of a payment intent
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentIntentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Stripe payment intent ID
 *         example: "pi_1234567890"
 *     responses:
 *       200:
 *         description: Payment status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentStatus'
 *       404:
 *         description: Payment not found
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
 * /api/payments/history:
 *   get:
 *     tags: [Stripe Payments]
 *     summary: Get user payment history
 *     description: Retrieves paginated payment history for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [requires_payment_method, requires_confirmation, requires_action, processing, requires_capture, canceled, succeeded, failed]
 *         description: Filter by payment status
 *     responses:
 *       200:
 *         description: Payment history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentHistory'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */



// ==================== STRIPE PRODUCTS & PRICES ====================

/**
 * @swagger
 * /api/stripe/products:
 *   get:
 *     summary: Get Stripe products
 *     tags: [Stripe Products]
 *     parameters:
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filter by active status (default true)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by product type (good, service)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of products to return (default 100)
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 products:
 *                   type: array
 *                   items:
 *                     type: object
 *                 hasMore:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *       500:
 *         description: Server error
 */
/**
 * @swagger
 * /api/stripe/prices/plan/monthly/with-available-discounts:
 *   get:
 *     summary: Get monthly plan prices with available discounts
 *     description: Retrieves all monthly subscription plans with their available discount options
 *     tags: [Stripe Products]
 *     parameters:
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filter by active status (default true)
 *       - in: query
 *         name: product
 *         schema:
 *           type: string
 *         description: Filter by specific product ID
 *       - in: query
 *         name: currency
 *         schema:
 *           type: string
 *         description: Filter by currency (e.g., usd, eur, cad)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of plans to return (default 100)
 *     responses:
 *       200:
 *         description: Monthly plan prices with discounts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Monthly plan prices with available discounts retrieved successfully"
 *                 plans:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       planType:
 *                         type: string
 *                         example: "monthly"
 *                       basePrice:
 *                         type: number
 *                         description: Base monthly price
 *                         example: 3.99
 *                       basePriceId:
 *                         type: string
 *                         description: Stripe price ID for the base monthly plan
 *                         example: "price_1SAbi9Fz7ul9ct4gi4IuFyI1"
 *                       currency:
 *                         type: string
 *                         example: "cad"
 *                       productId:
 *                         type: string
 *                         description: Stripe product ID
 *                         example: "prod_T6pMYRHk68V5iJ"
 *                       productName:
 *                         type: string
 *                         example: "Monthly Premium Subscription"
 *                       availableDiscounts:
 *                         type: array
 *                         description: Available discount options for this plan
 *                         items:
 *                           type: object
 *                           properties:
 *                             savings:
 *                               type: number
 *                               description: Amount saved in currency units
 *                               example: 1
 *                             discountedPrice:
 *                               type: number
 *                               description: Price after discount
 *                               example: 2.99
 *                             discountType:
 *                               type: string
 *                               example: "percentage"
 *                             discountValue:
 *                               type: number
 *                               description: Discount percentage
 *                               example: 25
 *                             priceId:
 *                               type: string
 *                               description: Stripe price ID for the discounted price
 *                               example: "price_1SAd1kFz7ul9ct4gI2U3qEEM"
 *                 count:
 *                   type: integer
 *                   description: Number of monthly plans returned
 *                   example: 1
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Server error"
 *                 error:
 *                   type: string
 *                   example: "Error message details"
 */
/**
 * @swagger
 * /api/stripe/products-with-prices:
 *   get:
 *     summary: Get Stripe products with their prices
 *     tags: [Stripe Products]
 *     parameters:
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filter by active status (default true)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by product type (good, service)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of products to return (default 100)
 *     responses:
 *       200:
 *         description: Products with prices retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 products:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       prices:
 *                         type: array
 *                         items:
 *                           type: object
 *                 count:
 *                   type: integer
 *       500:
 *         description: Server error
 */
/**
 * @swagger
 * /api/stripe/sync-products:
 *   post:
 *     summary: Sync Stripe products to database
 *     tags: [Stripe Products]
 *     responses:
 *       200:
 *         description: Products synced successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 products:
 *                   type: array
 *                   items:
 *                     type: object
 *                 count:
 *                   type: integer
 *       500:
 *         description: Server error
 */

// ==================== STRIPE WEBHOOKS ====================

/**
 * @swagger
 * /api/stripe/webhook:
 *   post:
 *     tags: [Stripe Webhooks]
 *     summary: Stripe webhook endpoint
 *     description: Handles Stripe webhook events for real-time updates
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WebhookEvent'
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 received:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Webhook signature verification failed
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: "Webhook Error: Invalid signature"
 *       500:
 *         description: Webhook processing failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Webhook handler failed"
 */
