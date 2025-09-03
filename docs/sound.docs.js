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
 *         uploadStatus:
 *           type: string
 *           enum: [uploading, completed, failed]
 *           description: File upload status
 *         uploadError:
 *           type: string
 *           description: Error message if upload failed
 *         uploadCompletedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when upload completed
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
 *     summary: Create a new sound with direct file URLs
 *     tags: [Sounds]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Creates a new sound record with pre-uploaded file URLs.
 *       Files should be uploaded directly to DigitalOcean Spaces from the frontend
 *       using the presigned-url endpoint or AWS SDK.
 *       This approach provides faster uploads and better performance.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
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
 *                 description: Sound title
 *               description:
 *                 type: string
 *                 description: Sound description
 *               categories:
 *                 type: string
 *                 description: JSON string of category IDs
 *               status:
 *                 type: string
 *                 enum: [Standard, Premium]
 *                 description: Sound access level
 *               soundFile:
 *                 type: string
 *                 format: uri
 *                 description: Direct URL to audio file in DigitalOcean Spaces
 *                 example: "https://comeaway-audio.nyc3.digitaloceanspaces.com/uploads/sound-1234567890.mp3"
 *               thumbnail:
 *                 type: string
 *                 format: uri
 *                 description: Direct URL to thumbnail image in DigitalOcean Spaces
 *                 example: "https://comeaway-audio.nyc3.digitaloceanspaces.com/uploads/thumb-1234567890.jpg"
 *     responses:
 *       201:
 *         description: Sound created successfully
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
 *                   description: Sound ID
 *                 uploadStatus:
 *                   type: string
 *                   enum: [completed]
 *                   example: "completed"
 *                 soundFile:
 *                   type: string
 *                   description: Sound file URL
 *                 thumbnail:
 *                   type: string
 *                   description: Thumbnail URL
 *       400:
 *         description: Validation error, duplicate title, or invalid URLs
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
 * /api/sounds/presigned-url:
 *   post:
 *     summary: Generate presigned URL for direct file upload
 *     tags: [Sounds]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Generates a presigned URL for direct file upload to DigitalOcean Spaces.
 *       Use this endpoint to get a temporary upload URL that allows frontend
 *       to upload files directly to Spaces without going through the backend.
 *       This provides faster uploads and better performance for large files.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fileName
 *               - fileType
 *             properties:
 *               fileName:
 *                 type: string
 *                 description: Original filename
 *                 example: "my-song.mp3"
 *               fileType:
 *                 type: string
 *                 description: MIME type of the file
 *                 example: "audio/mpeg"
 *     responses:
 *       200:
 *         description: Presigned URL generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 presignedUrl:
 *                   type: string
 *                   format: uri
 *                   description: Temporary URL for direct upload to Spaces
 *                 objectKey:
 *                   type: string
 *                   description: Object key in Spaces bucket
 *                 expires:
 *                   type: integer
 *                   description: URL expiration time in seconds
 *                 fileUrl:
 *                   type: string
 *                   format: uri
 *                   description: Final public URL after upload
 *       400:
 *         description: Missing required fields
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
 *       Note: This endpoint is mainly for backward compatibility with
 *       the old async upload approach. Direct uploads complete immediately.
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
 *     summary: Update sound with direct file URLs
 *     tags: [Sounds]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Updates an existing sound record with new information and file URLs.
 *       Files should be uploaded directly to DigitalOcean Spaces from the frontend
 *       before calling this endpoint. Only provide the fields you want to update.
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
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Sound title
 *               description:
 *                 type: string
 *                 description: Sound description
 *               categories:
 *                 type: string
 *                 description: JSON string of category IDs
 *               status:
 *                 type: string
 *                 enum: [Standard, Premium]
 *                 description: Sound access level
 *               soundFile:
 *                 type: string
 *                 format: uri
 *                 description: Direct URL to audio file in DigitalOcean Spaces (optional)
 *                 example: "https://comeaway-audio.nyc3.digitaloceanspaces.com/uploads/sound-1234567890.mp3"
 *               thumbnail:
 *                 type: string
 *                 format: uri
 *                 description: Direct URL to thumbnail image in DigitalOcean Spaces (optional)
 *                 example: "https://comeaway-audio.nyc3.digitaloceanspaces.com/uploads/thumb-1234567890.jpg"
 *     responses:
 *       200:
 *         description: Sound updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Sound updated successfully"
 *                 sound:
 *                   $ref: '#/components/schemas/Sound'
 *       400:
 *         description: Validation error or invalid URLs
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