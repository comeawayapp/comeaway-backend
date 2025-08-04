/**
 * @swagger
 * components:
 *   schemas:
 *     Badge:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated badge ID
 *         name:
 *           type: string
 *           description: Badge name
 *         description:
 *           type: string
 *           description: Badge description
 *         icon:
 *           type: string
 *           description: Badge icon URL
 *         criteria:
 *           type: string
 *           description: Badge earning criteria
 */

/**
 * @swagger
 * tags:
 *   name: Badges
 *   description: Badge and achievement endpoints
 */

/**
 * @swagger
 * /api/badges/badge-progress:
 *   get:
 *     summary: Get user's badge progress
 *     tags: [Badges]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Badge progress retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 badgeProgress:
 *                   type: object
 *                   properties:
 *                     totalPlayed:
 *                       type: number
 *                       description: Total sounds played
 *                     totalFavorites:
 *                       type: number
 *                       description: Total favorite sounds
 *                     totalPlaylists:
 *                       type: number
 *                       description: Total playlists created
 *                     badges:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Badge'
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