const express = require("express");
const router = express.Router();
const favoriteSoundController = require("../controllers/favoriteSoundController");
const authMiddleware = require("../middleware/auth"); // Assuming you have an auth middleware to verify JWT

// Add a sound to favorites
router.post("/add-favorite-sounds", authMiddleware, favoriteSoundController.addFavoriteSound);

// Remove a sound from favorites
router.delete("/remove-favorite-sounds", authMiddleware, favoriteSoundController.removeFavoriteSound);

// Get all favorite sounds for a user
router.get("/all-favorite-sounds", authMiddleware, favoriteSoundController.getFavoriteSounds);

module.exports = router;