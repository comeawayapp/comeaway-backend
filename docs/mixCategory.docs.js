/**
 * @swagger
 * components:
 *   schemas:
 *     MixCategory:
 *       type: object
 *       required:
 *         - name
 *         - slug
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         slug:
 *           type: string
 *         description:
 *           type: string
 *         createdBy:
 *           type: string
 *         publishedDate:
 *           type: string
 *           format: date-time
 *
 *     CreateMixCategoryRequest:
 *       type: object
 *       required:
 *         - name
 *         - slug
 *       properties:
 *         name:
 *           type: string
 *         slug:
 *           type: string
 *         description:
 *           type: string
 *
 *     UpdateMixCategoryRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         slug:
 *           type: string
 *         description:
 *           type: string
 *
 *     MixCategoryWithMixes:
 *       type: object
 *       properties:
 *         category:
 *           $ref: '#/components/schemas/MixCategory'
 *         mixes:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Mix'
 */

/**
 * @swagger
 * tags:
 *   name: MixCategories
 *   description: Mix category management
 */

/**
 * @swagger
 * /api/mix-categories/create:
 *   post:
 *     summary: Create a mix category
 *     tags: [MixCategories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMixCategoryRequest'
 *     responses:
 *       201:
 *         description: Mix category created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/mix-categories:
 *   get:
 *     summary: List all mix categories
 *     tags: [MixCategories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Categories retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MixCategory'
 */

/**
 * @swagger
 * /api/mix-categories/{id}:
 *   get:
 *     summary: Get a mix category by ID
 *     tags: [MixCategories]
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
 *         description: Category retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MixCategory'
 *       404:
 *         description: Not found
 *   put:
 *     summary: Update a mix category
 *     tags: [MixCategories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateMixCategoryRequest'
 *     responses:
 *       200:
 *         description: Updated
 *       404:
 *         description: Not found
 *   delete:
 *     summary: Delete a mix category
 *     tags: [MixCategories]
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
 *         description: Deleted
 *       404:
 *         description: Not found
 */

/**
 * @swagger
 * /api/mix-categories/{id}/mixes:
 *   get:
 *     summary: Get a mix category with its mixes (mobile)
 *     tags: [MixCategories]
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
 *         description: Category and mixes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MixCategoryWithMixes'
 *       404:
 *         description: Category not found
 */
