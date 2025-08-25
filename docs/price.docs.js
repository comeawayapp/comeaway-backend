/**
 * @swagger
 * components:
 *   schemas:
 *     Price:
 *       type: object
 *       required:
 *         - planType
 *         - basePrice
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated price ID
 *         planType:
 *           type: string
 *           enum: [monthly, annual, daily]
 *           description: Subscription plan type
 *         basePrice:
 *           type: number
 *           minimum: 0
 *           description: Base price for the plan
 *         currency:
 *           type: string
 *           enum: [USD, EUR, GBP, NGN]
 *           default: USD
 *           description: Currency for the price
 *         isActive:
 *           type: boolean
 *           default: true
 *           description: Whether the price is currently active
 *         description:
 *           type: string
 *           description: Description of the plan
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * tags:
 *   name: Pricing
 *   description: Price management endpoints
 */

/**
 * @swagger
 * /api/prices/create:
 *   post:
 *     summary: Create a new price
 *     tags: [Pricing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planType
 *               - basePrice
 *             properties:
 *               planType:
 *                 type: string
 *                 enum: [monthly, annual, daily]
 *               basePrice:
 *                 type: number
 *                 minimum: 0
 *               currency:
 *                 type: string
 *                 enum: [USD, EUR, GBP, NGN]
 *               description:
 *                 type: string
 *           examples:
 *             monthly_plan:
 *               summary: Monthly Plan Example
 *               value:
 *                 planType: "monthly"
 *                 basePrice: 9.99
 *                 currency: "USD"
 *                 description: "Monthly Pro Plan - Perfect for casual listeners"
 *             annual_plan:
 *               summary: Annual Plan Example
 *               value:
 *                 planType: "annual"
 *                 basePrice: 99.99
 *                 currency: "USD"
 *                 description: "Annual Pro Plan - Best value for music lovers"
 *             daily_plan:
 *               summary: Daily Plan Example
 *               value:
 *                 planType: "daily"
 *                 basePrice: 0.99
 *                 currency: "USD"
 *                 description: "Daily Pro Plan - Try before you buy"
 *     responses:
 *       201:
 *         description: Price created successfully
 *         content:
 *           application/json:
 *             examples:
 *               monthly_created:
 *                 summary: Monthly Plan Created
 *                 value:
 *                   message: "Price created successfully"
 *                   price: {
 *                     _id: "64f8a1b2c3d4e5f678901234",
 *                     planType: "monthly",
 *                     basePrice: 9.99,
 *                     currency: "USD",
 *                     description: "Monthly Pro Plan - Perfect for casual listeners",
 *                     isActive: true,
 *                     createdAt: "2024-01-15T10:30:00.000Z",
 *                     updatedAt: "2024-01-15T10:30:00.000Z"
 *                   }
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/prices/all:
 *   get:
 *     summary: Get all active prices
 *     tags: [Pricing]
 *     responses:
 *       200:
 *         description: Prices retrieved successfully
 *         content:
 *           application/json:
 *             examples:
 *               all_prices:
 *                 summary: All Active Prices
 *                 value:
 *                   message: "Prices retrieved successfully"
 *                   prices: [
 *                     {
 *                       _id: "64f8a1b2c3d4e5f678901234",
 *                       planType: "monthly",
 *                       basePrice: 9.99,
 *                       currency: "USD",
 *                       description: "Monthly Pro Plan - Perfect for casual listeners",
 *                       isActive: true,

 *                       createdAt: "2024-01-15T10:30:00.000Z",
 *                       updatedAt: "2024-01-15T10:30:00.000Z"
 *                     },
 *                     {
 *                       _id: "64f8a1b2c3d4e5f678901235",
 *                       planType: "annual",
 *                       basePrice: 99.99,
 *                       currency: "USD",
 *                       description: "Annual Pro Plan - Best value for music lovers",
 *                       isActive: true,
 *                       createdAt: "2024-01-15T10:30:00.000Z",
 *                       updatedAt: "2024-01-15T10:30:00.000Z"
 *                     },
 *                     {
 *                       _id: "64f8a1b2c3d4e5f678901236",
 *                       planType: "daily",
 *                       basePrice: 0.99,
 *                       currency: "USD",
 *                       description: "Daily Pro Plan - Try before you buy",
 *                       isActive: true,
 *                       createdAt: "2024-01-15T10:30:00.000Z",
 *                       updatedAt: "2024-01-15T10:30:00.000Z"
 *                     }
 *                   ]
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/prices/plan/{planType}:
 *   get:
 *     summary: Get price by plan type
 *     tags: [Pricing]
 *     parameters:
 *       - in: path
 *         name: planType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [monthly, annual, daily]
 *         description: Plan type to get price for
 *     responses:
 *       200:
 *         description: Price retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 price:
 *                   $ref: '#/components/schemas/Price'
 *       404:
 *         description: Price not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/prices/plan/{planType}/with-available-discounts:
 *   get:
 *     summary: Get price with available discounts (no automatic application)
 *     tags: [Pricing]
 *     parameters:
 *       - in: path
 *         name: planType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [monthly, annual, daily]
 *         description: Plan type to get price for
 *     responses:
 *       200:
 *         description: Price with available discounts retrieved successfully
 *         content:
 *           application/json:
 *             examples:
 *               monthly_with_discounts:
 *                 summary: Monthly Plan with Available Discounts
 *                 value:
 *                   message: "Price with available discounts retrieved successfully"
 *                   price: {
 *                     _id: "64f8a1b2c3d4e5f678901234",
 *                     planType: "monthly",
 *                     basePrice: 9.99,
 *                     currency: "USD",
 *                     description: "Monthly Pro Plan - Perfect for casual listeners",
 *                     isActive: true,
 *                     availableDiscounts: [
 *                       {
 *                         "id": "64f8a1b2c3d4e5f678901240",
 *                         "name": "New User Special",
 *                         "description": "Get 20% off your first month!",
 *                         "discountType": "percentage",
 *                         "discountValue": 20,
 *                         "couponCode": "A7B2K9X1",
 *                         "expiresAt": "2024-12-31",
 *                         "originalPrice": 9.99,
 *                         "discountedPrice": 7.99,
 *                         "savings": 2.00
 *                       },
 *                       {
 *                         "id": "64f8a1b2c3d4e5f678901241",
 *                         "name": "Summer Sale 2024",
 *                         "description": "Hot summer deals - 15% off all plans!",
 *                         "discountType": "percentage",
 *                         "discountValue": 15,
 *                         "couponCode": "K9M3P8Q2",
 *                         "expiresAt": "2024-08-31",
 *                         "originalPrice": 9.99,
 *                         "discountedPrice": 8.49,
 *                         "savings": 1.50
 *                       },
 *                       {
 *                         "id": "64f8a1b2c3d4e5f678901242",
 *                         "name": "Student Discount",
 *                         "description": "20% off for students with .edu email",
 *                         "discountType": "percentage",
 *                         "discountValue": 20,
 *                         "couponCode": "X5N1R7T4",
 *                         "expiresAt": "2024-12-31",
 *                         "originalPrice": 9.99,
 *                         "discountedPrice": 7.99,
 *                         "savings": 2.00
 *                       }
 *                     ],
 *                     createdAt: "2024-01-15T10:30:00.000Z",
 *                     updatedAt: "2024-01-15T10:30:00.000Z"
 *                   }
 *       404:
 *         description: Price not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/prices/apply-discount:
 *   post:
 *     summary: Apply discount to price using coupon code (automatically looks up base price)
 *     tags: [Pricing]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planType
 *               - couponCode
 *             properties:
 *               planType:
 *                 type: string
 *                 enum: [monthly, annual, daily]
 *                 description: Plan type to apply discount to
 *               couponCode:
 *                 type: string
 *                 description: Coupon code to apply (system automatically looks up base price)
 *     responses:
 *       200:
 *         description: Discount applied successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 originalPrice:
 *                   type: number
 *                   description: Base price for the plan (automatically looked up)
 *                 finalPrice:
 *                   type: number
 *                   description: Price after discount applied
 *                 savings:
 *                   type: number
 *                   description: Amount saved with discount
 *                 discount:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     discountType:
 *                       type: string
 *                     discountValue:
 *                       type: number
 *                     couponCode:
 *                       type: string
 *                 planType:
 *                   type: string
 *                 currency:
 *                   type: string
 *       400:
 *         description: Bad request or invalid coupon
 *       404:
 *         description: Price or discount not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/prices/plan/{planType}:
 *   put:
 *     summary: Update price for a plan type
 *     tags: [Pricing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [monthly, annual, daily]
 *         description: Plan type to update price for
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               basePrice:
 *                 type: number
 *                 minimum: 0
 *               currency:
 *                 type: string
 *                 enum: [USD, EUR, GBP, NGN]
 *               description:
 *                 type: string

 *     responses:
 *       200:
 *         description: Price updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 price:
 *                   $ref: '#/components/schemas/Price'
 *       404:
 *         description: Price not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/prices/assign-discount:
 *   post:
 *     summary: Assign a discount to a price (only one discount per price)
 *     tags: [Pricing]
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
 *               - discountId
 *             properties:
 *               priceId:
 *                 type: string
 *                 description: ID of the price to assign discount to
 *               discountId:
 *                 type: string
 *                 description: ID of the discount to assign
 *     responses:
 *       200:
 *         description: Discount assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 price:
 *                   $ref: '#/components/schemas/Price'
 *       400:
 *         description: Bad request or discount not active
 *       404:
 *         description: Price or discount not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/prices/remove-discount/{priceId}:
 *   delete:
 *     summary: Remove discount from a price
 *     tags: [Pricing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: priceId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the price to remove discount from
 *     responses:
 *       200:
 *         description: Discount removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 price:
 *                   $ref: '#/components/schemas/Price'
 *       404:
 *         description: Price not found
 *       500:
 *         description: Server error
 */
