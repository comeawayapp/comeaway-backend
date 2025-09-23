/**
 * @swagger
 * components:
 *   schemas:
 *     PaymentSheetRequest:
 *       type: object
 *       required:
 *         - plan
 *         - priceId
 *         - userId
 *       properties:
 *         plan:
 *           type: string
 *           description: Subscription plan name
 *         priceId:
 *           type: string
 *           description: ID of the price record to use for payment calculation
 *         userId:
 *           type: string
 *           description: User ID (required for customer management)
 *     
 *     PaymentSheetResponse:
 *       type: object
 *       properties:
 *         paymentIntent:
 *           type: string
 *           description: Stripe payment intent client secret
 *         ephemeralKey:
 *           type: string
 *           description: Stripe ephemeral key for the customer
 *         customer:
 *           type: string
 *           description: Stripe customer ID
 *         publishableKey:
 *           type: string
 *           description: Stripe publishable key for the frontend
 *     
 *     PaymentIntentRequest:
 *       type: object
 *       required:
 *         - amount
 *         - currency
 *       properties:
 *         amount:
 *           type: number
 *           description: Payment amount in cents
 *         currency:
 *           type: string
 *           description: Currency code (3 letters, e.g., 'usd')
 *         metadata:
 *           type: object
 *           description: Additional metadata for the payment intent
 *     
 *     PaymentIntentResponse:
 *       type: object
 *       properties:
 *         clientSecret:
 *           type: string
 *           description: Stripe payment intent client secret
 *     
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           description: Error message
 */

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment processing endpoints
 */

/**
 * @swagger
 * /api/payments/payment-sheet:
 *   post:
 *     summary: Create payment sheet parameters for Stripe payment
 *     description: Creates a Stripe payment intent and returns the necessary parameters for the frontend to display a payment sheet. The endpoint automatically calculates the final price including any applicable discounts and manages Stripe customers efficiently by reusing existing customers when possible.
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentSheetRequest'
 *     responses:
 *       200:
 *         description: Payment sheet parameters created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentSheetResponse'
 *       400:
 *         description: Bad request - missing required fields
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
