/**
 * @swagger
 * components:
 *   schemas:
 *     Playlist:
 *       type: object
 *       required:
 *         - name
 *         - userId
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated playlist ID
 *         name:
 *           type: string
 *           description: Playlist name
 *         userId:
 *           type: string
 *           description: User ID who created the playlist
 *         sounds:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of sound IDs in the playlist
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     
 *     CreatePlaylistRequest:
 *       type: object
 *       required:
 *         - name
 *         - userId
 *       properties:
 *         name:
 *           type: string
 *           description: Playlist name
 *         userId:
 *           type: string
 *           description: User ID who created the playlist
 *     
 *     UpdatePlaylistRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: New playlist name
 *     
 *     AddSoundsToPlaylistRequest:
 *       type: object
 *       required:
 *         - playlistId
 *         - soundsIds
 *       properties:
 *         playlistId:
 *           type: string
 *           description: Playlist ID
 *         soundsIds:
 *           oneOf:
 *             - type: string
 *               description: Comma-separated string of sound IDs (e.g., "id1,id2,id3")
 *             - type: array
 *               items:
 *                 type: string
 *               description: Array of sound IDs
 *           description: Sound IDs to add to playlist
 *     
 *     RemoveSoundsFromPlaylistRequest:
 *       type: object
 *       required:
 *         - playlistId
 *         - soundsIds
 *       properties:
 *         playlistId:
 *           type: string
 *           description: Playlist ID
 *         soundsIds:
 *           oneOf:
 *             - type: string
 *               description: Comma-separated string of sound IDs (e.g., "id1,id2,id3")
 *             - type: array
 *               items:
 *                 type: string
 *               description: Array of sound IDs
 *           description: Sound IDs to remove from playlist
 *     
 *     PlaylistResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         playlist:
 *           $ref: '#/components/schemas/Playlist'
 *     
 *     PlaylistsListResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         playlists:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Playlist'
 *     
 *     PlaylistWithSoundsResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         playlist:
 *           $ref: '#/components/schemas/Playlist'
 *         sounds:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Sound'
 */

/**
 * @swagger
 * tags:
 *   name: Playlists
 *   description: Playlist management endpoints
 */

/**
 * @swagger
 * /api/playlists/create-playlist:
 *   post:
 *     summary: Create a new playlist
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePlaylistRequest'
 *     responses:
 *       201:
 *         description: Playlist created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlaylistResponse'
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
 * /api/playlists/add-sounds:
 *   post:
 *     summary: Add sounds to a playlist
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddSoundsToPlaylistRequest'
 *     responses:
 *       200:
 *         description: Sounds added to playlist successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlaylistResponse'
 *       400:
 *         description: Validation error or no valid sounds to add
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
 *         description: Playlist not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Sounds already exist in playlist
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
 * /api/playlists/remove-sounds:
 *   post:
 *     summary: Remove sounds from a playlist
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RemoveSoundsFromPlaylistRequest'
 *     responses:
 *       200:
 *         description: Sounds removed from playlist successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlaylistResponse'
 *       400:
 *         description: Validation error or no valid sound IDs provided
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
 *         description: Playlist not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: None of the provided sounds are in the playlist
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
 * /api/playlists/all-playlist/{userId}:
 *   get:
 *     summary: Get all playlists for a specific user
 *     tags: [Playlists]
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
 *         description: Playlists retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Playlist'
 *       400:
 *         description: Invalid user ID format
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
 *         description: No playlists found for this user
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
 * /api/playlists/all-playlists:
 *   get:
 *     summary: Get all playlists
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All playlists retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Playlist'
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
 * /api/playlists/{playlistId}:
 *   delete:
 *     summary: Delete a playlist
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: playlistId
 *         required: true
 *         schema:
 *           type: string
 *         description: Playlist ID
 *     responses:
 *       200:
 *         description: Playlist deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid playlist ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized or invalid user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - user does not own this playlist
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Playlist not found
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