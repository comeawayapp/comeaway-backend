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
 *     summary: Get all active assignments for a specific price
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
 *         description: Assignments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 assignments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PriceDiscountAssignment'
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/price-discount-assignments/all:
 *   get:
 *     summary: Get all active assignments
 *     tags: [Price-Discount Assignments]
 *     responses:
 *       200:
 *         description: All assignments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 assignments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PriceDiscountAssignment'
 *       500:
 *         description: Server error
 */
