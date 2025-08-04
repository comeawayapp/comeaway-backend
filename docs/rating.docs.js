/**
 * @swagger
 * components:
 *   schemas:
 *     AppRating:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated rating ID
 *         userId:
 *           type: string
 *           description: User ID
 *         rating:
 *           type: number
 *           description: Rating value (1-5)
 *         review:
 *           type: string
 *           description: Review text
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * tags:
 *   name: App Ratings
 *   description: App rating and review endpoints
 */

/**
 * @swagger
 * /api/app-ratings/create:
 *   post:
 *     summary: Submit app rating and feedback
 *     tags: [App Ratings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Rating value (1-5)
 *               review:
 *                 type: string
 *                 description: Review text (optional)
 *     responses:
 *       200:
 *         description: Rating submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 appRating:
 *                   $ref: '#/components/schemas/AppRating'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * /api/app-ratings/all:
 *   get:
 *     summary: Get all app ratings and feedback
 *     tags: [App Ratings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: App ratings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 appRatings:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AppRating'
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