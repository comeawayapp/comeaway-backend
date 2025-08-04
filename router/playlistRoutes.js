const express = require("express");
const router = express.Router();
const playlistController = require("../controllers/playlistController");
const authMiddleware = require("../middleware/auth"); // Assuming you have an auth middleware to verify JWT

// Create a new playlist
router.post(
  "/create-playlist",
  authMiddleware,
  playlistController.createPlaylist
);

// Add sounds to a playlist
router.post(
  "/add-sounds",
  authMiddleware,
  playlistController.addSoundsToPlaylist
);
router.post(
  "/remove-sounds",
  authMiddleware,
  playlistController.removeSoundsFromPlaylist
);
router.get(
  "/all-playlist/:userId",
  authMiddleware,
  playlistController.getAllPlaylists
);
router.get(
  "/all-playlists",
  authMiddleware,
  playlistController.getAllPlaylists
);

// Remove (delete) a playlist by ID
router.delete(
  "/:playlistId",
  authMiddleware,
  playlistController.removePlaylist
);

module.exports = router;
