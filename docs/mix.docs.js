/**
 * @swagger
 * components:
 *   schemas:
 *     Mix:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         soundFile:
 *           type: string
 *         thumbnail:
 *           type: string
 *         categories:
 *           type: array
 *           items:
 *             type: string
 *           description: MixCategory ObjectIds
 *         status:
 *           type: string
 *           enum: [Standard, Premium]
 *         playCount:
 *           type: number
 *         addedDate:
 *           type: string
 *           format: date-time
 *         duration:
 *           type: number
 *         narrator:
 *           type: string
 *           nullable: true
 *         author:
 *           type: string
 *           nullable: true
 *         uploadStatus:
 *           type: string
 *           enum: [uploading, completed, failed]
 *
 *     CreateMixRequest:
 *       type: object
 *       required:
 *         - title
 *         - categories
 *         - status
 *         - thumbnail
 *         - soundFile
 *         - duration
 *       properties:
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         categories:
 *           type: array
 *           items:
 *             type: string
 *         status:
 *           type: string
 *           enum: [Standard, Premium]
 *         thumbnail:
 *           type: string
 *         soundFile:
 *           type: string
 *         duration:
 *           type: number
 *         narrator:
 *           type: string
 *           nullable: true
 *         author:
 *           type: string
 *           nullable: true
 *
 *     UpdateMixRequest:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         categories:
 *           type: array
 *           items:
 *             type: string
 *         status:
 *           type: string
 *           enum: [Standard, Premium]
 *         thumbnail:
 *           type: string
 *         soundFile:
 *           type: string
 *         duration:
 *           type: number
 *         narrator:
 *           type: string
 *           nullable: true
 *         author:
 *           type: string
 *           nullable: true
 */

/**
 * @swagger
 * tags:
 *   name: Mixes
 *   description: Short mix clip management
 */

/**
 * @swagger
 * /api/mixes/add-mix:
 *   post:
 *     summary: Create a new mix
 *     tags: [Mixes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMixRequest'
 *     responses:
 *       201:
 *         description: Mix created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/mixes/getMixes:
 *   get:
 *     summary: List mixes
 *     tags: [Mixes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by MixCategory ObjectId
 *       - in: query
 *         name: narrator
 *         schema:
 *           type: string
 *       - in: query
 *         name: author
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Mixes retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Mix'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/mixes/getSingleMix/{id}:
 *   get:
 *     summary: Get a mix by ID
 *     tags: [Mixes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Mix retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Mix'
 *       404:
 *         description: Mix not found
 */

/**
 * @swagger
 * /api/mixes/updateMix/{id}:
 *   put:
 *     summary: Update a mix
 *     tags: [Mixes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateMixRequest'
 *     responses:
 *       200:
 *         description: Mix updated successfully
 *       404:
 *         description: Mix not found
 */

/**
 * @swagger
 * /api/mixes/deleteMix/{id}:
 *   delete:
 *     summary: Delete a mix
 *     tags: [Mixes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Mix deleted successfully
 *       404:
 *         description: Mix not found
 */
