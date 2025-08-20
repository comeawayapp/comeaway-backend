/**
 * @swagger
 * components:
 *   schemas:
 *     PriceDiscountAssignment:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier for the assignment
 *         priceId:
 *           type: string
 *           description: ID of the price this discount is assigned to
 *         discountId:
 *           type: string
 *           description: ID of the discount assigned to this price
 *         isActive:
 *           type: boolean
 *           description: Whether this assignment is currently active
 *         assignedAt:
 *           type: string
 *           format: date-time
 *           description: When this discount was assigned to the price
 *         assignedBy:
 *           type: string
 *           description: ID of the user who made this assignment (optional)
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
 *   name: Price-Discount Assignments
 *   description: Manage which discounts are assigned to which prices
 */

/**
 * @swagger
 * /api/price-discount-assignments/assign:
 *   post:
 *     summary: Assign a discount to a price
 *     tags: [Price-Discount Assignments]
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
 *                 description: ID of the price to assign the discount to
 *               discountId:
 *                 type: string
 *                 description: ID of the discount to assign
 *     responses:
 *       200:
 *         description: Discount assigned to price successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 assignment:
 *                   $ref: '#/components/schemas/PriceDiscountAssignment'
 *       400:
 *         description: Bad request
 *       404:
 *         description: Price or discount not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/price-discount-assignments/remove/{priceId}/{discountId}:
 *   put:
 *     summary: Remove a discount assignment from a price
 *     tags: [Price-Discount Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: priceId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the price
 *       - in: path
 *         name: discountId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the discount to remove
 *     responses:
 *       200:
 *         description: Discount removed from price successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 assignment:
 *                   $ref: '#/components/schemas/PriceDiscountAssignment'
 *       404:
 *         description: Assignment not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/price-discount-assignments/price/{priceId}:
 *   get:
 *     summary: Get all active assignments for a specific price (or price details if no assignments exist)
 *     tags: [Price-Discount Assignments]
 *     parameters:
 *       - in: path
 *         name: priceId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the price
 *     responses:
 *       200:
 *         description: Assignments retrieved successfully, or price details if no assignments exist
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   description: When assignments exist for the price
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Assignments retrieved successfully"
 *                     assignments:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/PriceDiscountAssignment'
 *                 - type: object
 *                   description: When no assignments exist for the price
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "No discount assignments found for this price. Here are the price details:"
 *                     assignments:
 *                       type: array
 *                       items: []
 *                       description: Empty array when no assignments exist
 *                     price:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           description: Price ID
 *                         planType:
 *                           type: string
 *                           enum: [monthly, annual, daily]
 *                           description: Subscription plan type
 *                         basePrice:
 *                           type: number
 *                           description: Base price for the plan
 *                         currency:
 *                           type: string
 *                           description: Currency for the price
 *                         description:
 *                           type: string
 *                           description: Description of the plan
 *                         isActive:
 *                           type: boolean
 *                           description: Whether the price is currently active
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *             examples:
 *               with_assignments:
 *                 summary: When assignments exist for the price
 *                 value:
 *                   message: "Assignments retrieved successfully"
 *                   assignments: [
 *                     {
 *                       _id: "64f8a1b2c3d4e5f678901234",
 *                       priceId: "64f8a1b2c3d4e5f678901235",
 *                       discountId: {
 *                         _id: "64f8a1b2c3d4e5f678901236",
 *                         name: "Summer Sale",
 *                         discountType: "percentage",
 *                         discountValue: 20
 *                       },
 *                       isActive: true,
 *                       assignedAt: "2024-01-15T10:30:00.000Z"
 *                     }
 *                   ]
 *               no_assignments:
 *                 summary: When no assignments exist for the price
 *                 value:
 *                   message: "No discount assignments found for this price. Here are the price details:"
 *                   assignments: []
 *                   price: {
 *                     _id: "64f8a1b2c3d4e5f678901235",
 *                     planType: "monthly",
 *                     basePrice: 9.99,
 *                     currency: "USD",
 *                     description: "Monthly Pro Plan - Perfect for casual listeners",
 *                     isActive: true,
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
 * /api/price-discount-assignments/all:
 *   get:
 *     summary: Get all active assignments (or all available prices if no assignments exist)
 *     tags: [Price-Discount Assignments]
 *     responses:
 *       200:
 *         description: All assignments retrieved successfully, or all available prices if no assignments exist
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   description: When assignments exist
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "All assignments retrieved successfully"
 *                     assignments:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/PriceDiscountAssignment'
 *                 - type: object
 *                   description: When no assignments exist
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "No discount assignments found. Here are all available prices:"
 *                     assignments:
 *                       type: array
 *                       items: []
 *                       description: Empty array when no assignments exist
 *                     availablePrices:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             description: Price ID
 *                           planType:
 *                             type: string
 *                             enum: [monthly, annual, daily]
 *                             description: Subscription plan type
 *                           basePrice:
 *                             type: number
 *                             description: Base price for the plan
 *                           currency:
 *                             type: string
 *                             description: Currency for the price
 *                           description:
 *                             type: string
 *                             description: Description of the plan
 *                           isActive:
 *                             type: boolean
 *                             description: Whether the price is currently active
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *             examples:
 *               with_assignments:
 *                 summary: When assignments exist
 *                 value:
 *                   message: "All assignments retrieved successfully"
 *                   assignments: [
 *                     {
 *                       _id: "64f8a1b2c3d4e5f678901234",
 *                       priceId: {
 *                         _id: "64f8a1b2c3d4e5f678901235",
 *                         planType: "monthly",
 *                         basePrice: 9.99,
 *                         currency: "USD",
 *                         description: "Monthly Pro Plan"
 *                       },
 *                       discountId: {
 *                         _id: "64f8a1b2c3d4e5f678901236",
 *                         name: "Summer Sale",
 *                         discountType: "percentage",
 *                         discountValue: 20
 *                       },
 *                       isActive: true,
 *                       assignedAt: "2024-01-15T10:30:00.000Z"
 *                     }
 *                   ]
 *               no_assignments:
 *                 summary: When no assignments exist
 *                 value:
 *                   message: "No discount assignments found. Here are all available prices:"
 *                   assignments: []
 *                   availablePrices: [
 *                     {
 *                       _id: "64f8a1b2c3d4e5f678901235",
 *                       planType: "monthly",
 *                       basePrice: 9.99,
 *                       currency: "USD",
 *                       description: "Monthly Pro Plan - Perfect for casual listeners",
 *                       isActive: true,
 *                       createdAt: "2024-01-15T10:30:00.000Z",
 *                       updatedAt: "2024-01-15T10:30:00.000Z"
 *                     },
 *                     {
 *                       _id: "64f8a1b2c3d4e5f678901236",
 *                       planType: "annual",
 *                       basePrice: 99.99,
 *                       currency: "USD",
 *                       description: "Annual Pro Plan - Best value for music lovers",
 *                       isActive: true,
 *                       createdAt: "2024-01-15T10:30:00.000Z",
 *                       updatedAt: "2024-01-15T10:30:00.000Z"
 *                     }
 *                   ]
 *       500:
 *         description: Server error
 */
