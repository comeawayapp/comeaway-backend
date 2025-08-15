/**
 * @swagger
 * components:
 *   schemas:
 *     Discount:
 *       type: object
 *       required:
 *         - name
 *         - description
 *         - discountType
 *         - discountValue
 *         - startDate
 *         - endDate
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated discount ID
 *         name:
 *           type: string
 *           description: Name of the discount (e.g., "July Special")
 *         description:
 *           type: string
 *           description: Description of the discount
 *         discountType:
 *           type: string
 *           enum: [percentage, fixed]
 *           description: Type of discount (percentage or fixed amount)
 *         discountValue:
 *           type: number
 *           minimum: 0
 *           description: Discount value (percentage or fixed amount)
 *         applicablePlans:
 *           type: array
 *           items:
 *             type: string
 *             enum: [monthly, annual, daily, all]
 *           default: [all]
 *           description: Plans this discount applies to
 *         startDate:
 *           type: string
 *           format: date
 *           description: Start date for the discount (YYYY-MM-DD format, no time)
 *           example: "2025-08-15"
 *         endDate:
 *           type: string
 *           format: date
 *           description: End date for the discount (YYYY-MM-DD format, no time)
 *           example: "2025-09-15"
 *         isActive:
 *           type: boolean
 *           default: true
 *           description: Whether the discount is currently active
 *         usageLimit:
 *           type: number
 *           nullable: true
 *           description: Maximum number of times this discount can be used (null for unlimited)
 *           example: 500
 *         usedCount:
 *           type: number
 *           default: 0
 *           description: Number of times this discount has been used
 *         couponCode:
 *           type: string
 *           description: Auto-generated unique coupon code for the discount
 *           example: "A7B2K9X1"
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
 *   name: Discounts
 *   description: Discount management endpoints
 */

/**
 * @swagger
 * /api/discount/create:
 *   post:
 *     summary: Create a new discount
 *     tags: [Discounts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - discountType
 *               - discountValue
 *               - startDate
 *               - endDate
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               discountType:
 *                 type: string
 *                 enum: [percentage, fixed]
 *               discountValue:
 *                 type: number
 *                 minimum: 0
 *               applicablePlans:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [monthly, annual, daily, all]
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               usageLimit:
 *                 type: number
 *     responses:
 *       201:
 *         description: Discount created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 discount:
 *                   $ref: '#/components/schemas/Discount'
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/discount/all:
 *   get:
 *     summary: Get all discounts
 *     tags: [Discounts]
 *     responses:
 *       200:
 *         description: Discounts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 discounts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Discount'
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/discount/active:
 *   get:
 *     summary: Get active discounts
 *     tags: [Discounts]
 *     parameters:
 *       - in: query
 *         name: planType
 *         schema:
 *           type: string
 *           enum: [monthly, annual, daily, all]
 *         description: Filter by plan type
 *     responses:
 *       200:
 *         description: Active discounts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 discounts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Discount'
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/discount/{id}:
 *   get:
 *     summary: Get discount by ID
 *     tags: [Discounts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Discount ID
 *     responses:
 *       200:
 *         description: Discount retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 discount:
 *                   $ref: '#/components/schemas/Discount'
 *       404:
 *         description: Discount not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/discount/{id}:
 *   put:
 *     summary: Update discount
 *     tags: [Discounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Discount ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               discountType:
 *                 type: string
 *                 enum: [percentage, fixed]
 *               discountValue:
 *                 type: number
 *               applicablePlans:
 *                 type: array
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               isActive:
 *                 type: boolean
 *               usageLimit:
 *                 type: number
 *     responses:
 *       200:
 *         description: Discount updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 discount:
 *                   $ref: '#/components/schemas/Discount'
 *       404:
 *         description: Discount not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/discount/{id}:
 *   delete:
 *     summary: Delete discount
 *     tags: [Discounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Discount ID
 *     responses:
 *       200:
 *         description: Discount deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 discount:
 *                   $ref: '#/components/schemas/Discount'
 *       404:
 *         description: Discount not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * Note:
 *   description: |
 *     **Important:** Discounts are applied through the price endpoint, not the discount endpoint.
 *     
 *     To apply a discount, use:
 *     - **Endpoint:** `POST /api/price/apply-discount`
 *     - **Body:** `{ "planType": "monthly", "couponCode": "A7B2K9X1" }`
 *     
 *     The system automatically looks up the base price and applies the discount.
 *     No need to provide basePrice or discountId manually.
 */
