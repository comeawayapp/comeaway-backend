/**
 * @swagger
 * components:
 *   schemas:
 *     PaymentSheetRequest:
 *       type: object
 *       required:
 *         - plan
 *         - priceId
 *       properties:
 *         plan:
 *           type: string
 *           description: Subscription plan name
 *         priceId:
 *           type: string
 *           description: ID of the price record to use for payment calculation
 *         userId:
 *           type: string
 *           description: User ID (optional, used for metadata)
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
 *     summary: Create payment sheet parameters for Stripe payment
 *     description: Creates a Stripe payment intent and returns the necessary parameters for the frontend to display a payment sheet. The endpoint automatically calculates the final price including any applicable discounts.
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
 *       404:
 *         description: Price not found
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