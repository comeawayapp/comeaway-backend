/**
 * @swagger
 * components:
 *   schemas:
 *     Sound:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - categories
 *         - status
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated sound ID
 *         title:
 *           type: string
 *           description: Sound title
 *         description:
 *           type: string
 *           description: Sound description
 *         soundFile:
 *           type: string
 *           description: Path to sound file
 *         thumbnail:
 *           type: string
 *           description: Path to thumbnail image
 *         categories:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of category IDs
 *         status:
 *           type: string
 *           enum: [Standard, Premium]
 *           description: Sound access level
 *         playCount:
 *           type: number
 *           description: Number of times played
 *         addedDate:
 *           type: string
 *           format: date-time
 *           description: Date when sound was added
 *         duration:
 *           type: number
 *           description: Duration in seconds
 *     
 *     CreateSoundRequest:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - categories
 *         - status
 *       properties:
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         categories:
 *           type: string
 *           description: JSON string of category IDs
 *         status:
 *           type: string
 *           enum: [Standard, Premium]
 *     
 *     UpdateSoundRequest:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         categories:
 *           type: string
 *           description: JSON string of category IDs
 *         status:
 *           type: string
 *           enum: [Standard, Premium]
 *     
 *     SoundResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         sound:
 *           $ref: '#/components/schemas/Sound'
 *     
 *     SoundsListResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         sounds:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Sound'
 *     
 *     PopularSoundsResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         sounds:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Sound'
 *     
 *     RecentlyPlayedResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         sounds:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Sound'
 *     
 *     SearchSoundsRequest:
 *       type: object
 *       properties:
 *         query:
 *           type: string
 *           description: Search query
 *         category:
 *           type: string
 *           description: Category ID to filter by
 *         status:
 *           type: string
 *           enum: [Standard, Premium]
 *           description: Status to filter by
 *         page:
 *           type: integer
 *           description: Page number for pagination
 *         limit:
 *           type: integer
 *           description: Number of items per page
 *     
 *     SearchSoundsResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         sounds:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Sound'
 *         total:
 *           type: integer
 *           description: Total number of sounds
 *         page:
 *           type: integer
 *           description: Current page
 *         totalPages:
 *           type: integer
 *           description: Total number of pages
 *     
 *     PlaySoundRequest:
 *       type: object
 *       required:
 *         - soundId
 *       properties:
 *         soundId:
 *           type: string
 *           description: Sound ID to play
 *     
 *     PlaySoundResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         playCount:
 *           type: number
 *           description: Updated play count
 */

/**
 * @swagger
 * tags:
 *   name: Sounds
 *   description: Sound management endpoints
 */

/**
 * @swagger
 * /api/sounds/add-sounds:
 *   post:
 *     summary: Create a new sound with asynchronous file upload
 *     tags: [Sounds]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Creates a new sound record immediately and returns response to frontend.
 *       File uploads happen asynchronously in the background.
 *       Use the upload-status endpoint to check when files are ready.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - categories
 *               - status
 *               - soundFile
 *               - thumbnail
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               categories:
 *                 type: string
 *                 description: JSON string of category IDs
 *               status:
 *                 type: string
 *                 enum: [Standard, Premium]
 *               soundFile:
 *                 type: string
 *                 format: binary
 *                 description: Audio file (MP3, WAV, M4A) - Max 100MB, uploaded asynchronously
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *                 description: Thumbnail image (JPEG, PNG, GIF) - Max 100MB, uploaded asynchronously
 *     responses:
 *       201:
 *         description: Sound created successfully (files uploading in background)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Sound created successfully"
 *                 soundId:
 *                   type: string
 *                   description: Sound ID to track upload status
 *                 uploadStatus:
 *                   type: string
 *                   enum: [uploading]
 *                   example: "uploading"
 *       400:
 *         description: Validation error or duplicate title
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
 * /api/sounds/upload-status/{id}:
 *   get:
 *     summary: Check file upload status for a sound
 *     tags: [Sounds]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Check the status of asynchronous file uploads for a sound.
 *       Poll this endpoint to know when files are ready for use.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Sound ID
 *     responses:
 *       200:
 *         description: Upload status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 soundId:
 *                   type: string
 *                   description: Sound ID
 *                 uploadStatus:
 *                   type: string
 *                   enum: [uploading, completed, failed]
 *                   description: Current upload status
 *                 uploadError:
 *                   type: string
 *                   description: Error message if upload failed
 *                 soundFile:
 *                   type: string
 *                   description: Sound file URL (only if completed)
 *                 thumbnail:
 *                   type: string
 *                   description: Thumbnail URL (only if completed)
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Sound not found
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
 * /api/sounds/getSounds:
 *   get:
 *     summary: Get all sounds with optional filtering
 *     tags: [Sounds]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Standard, Premium]
 *         description: Filter by status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Sounds retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SearchSoundsResponse'
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
 * /api/sounds/getSingleSound/{id}:
 *   get:
 *     summary: Get sound by ID
 *     tags: [Sounds]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Sound ID
 *     responses:
 *       200:
 *         description: Sound retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SoundResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Sound not found
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
 * /api/sounds/updateSound/{id}:
 *   put:
 *     summary: Update sound
 *     tags: [Sounds]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Sound ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               categories:
 *                 type: string
 *                 description: JSON string of category IDs
 *               status:
 *                 type: string
 *                 enum: [Standard, Premium]
 *               soundFile:
 *                 type: string
 *                 format: binary
 *                 description: Audio file (MP3, WAV, M4A)
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *                 description: Thumbnail image (JPEG, PNG, GIF)
 *     responses:
 *       200:
 *         description: Sound updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SoundResponse'
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
 *       404:
 *         description: Sound not found
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
 * /api/sounds/deleteSound/{id}:
 *   delete:
 *     summary: Delete sound
 *     tags: [Sounds]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Sound ID
 *     responses:
 *       200:
 *         description: Sound deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Sound not found
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
 * /api/sounds/search:
 *   get:
 *     summary: Search sounds
 *     tags: [Sounds]
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Standard, Premium]
 *         description: Filter by status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SearchSoundsResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/sounds/popular-today:
 *   get:
 *     summary: Get popular sounds for today
 *     tags: [Sounds]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of sounds to return
 *     responses:
 *       200:
 *         description: Popular sounds retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PopularSoundsResponse'
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
 * /api/sounds/play:
 *   post:
 *     summary: Record sound play
 *     tags: [Sounds]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - soundId
 *             properties:
 *               soundId:
 *                 type: string
 *                 description: Sound ID to play
 *     responses:
 *       200:
 *         description: Play recorded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlaySoundResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Sound not found
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
 * /api/sounds/recently-played/{userId}:
 *   get:
 *     summary: Get recently played sounds for a user
 *     tags: [Sounds]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Recently played sounds retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RecentlyPlayedResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
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