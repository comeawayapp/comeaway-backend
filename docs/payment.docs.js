/**
 * @swagger
 * components:
 *   schemas:
 *     PaymentSheetRequest:
 *       type: object
 *       required:
 *         - amount
 *       properties:
 *         amount:
 *           type: number
 *           description: Payment amount in dollars
 *         plan:
 *           type: string
 *           description: Subscription plan
 *         userId:
 *           type: string
 *           description: User ID
 *     
 *     PaymentSheetResponse:
 *       type: object
 *       properties:
 *         paymentIntent:
 *           type: string
 *           description: Stripe payment intent client secret
 *         ephemeralKey:
 *           type: string
 *           description: Stripe ephemeral key
 *         customer:
 *           type: string
 *           description: Stripe customer ID
 *         publishableKey:
 *           type: string
 *           description: Stripe publishable key
 */

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment processing endpoints
 */

/**
 * @swagger
 * /api/payment-sheet:
 *   post:
 *     summary: Create payment sheet for Stripe
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentSheetRequest'
 *     responses:
 *       200:
 *         description: Payment sheet created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentSheetResponse'
 *       400:
 *         description: Invalid request
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