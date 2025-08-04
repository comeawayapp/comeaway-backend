/**
 * @swagger
 * components:
 *   schemas:
 *     Narrator:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated narrator ID
 *         name:
 *           type: string
 *           description: Narrator name
 *         bio:
 *           type: string
 *           description: Narrator biography
 *         avatar:
 *           type: string
 *           description: Avatar image URL
 */

/**
 * @swagger
 * tags:
 *   name: Narrators
 *   description: Narrator management endpoints
 */

/**
 * @swagger
 * /api/narrators/all:
 *   get:
 *     summary: Get all narrators
 *     tags: [Narrators]
 *     responses:
 *       200:
 *         description: Narrators retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 narrators:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Narrator'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/narrators/create:
 *   post:
 *     summary: Create a new narrator
 *     tags: [Narrators]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Narrator name
 *               bio:
 *                 type: string
 *                 description: Narrator biography
 *               avatar:
 *                 type: string
 *                 description: Avatar image URL
 *     responses:
 *       201:
 *         description: Narrator created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 narrator:
 *                   $ref: '#/components/schemas/Narrator'
 *       400:
 *         description: Validation error
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