const express = require("express");
const router = express.Router();
const soundController = require("../controllers/soundController");
const authMiddleware = require("../middleware/auth"); // Updated path
const { checkProStatus, skipBodyParsing } = require("../middleware/index");
const logger = require("../utils/logger");

// Import multer configuration from sound controller
const { createSoundWithUpload } = require("../controllers/soundController");

// Create sound route - skip body parsing for file upload
router.post("/add-sounds", skipBodyParsing, authMiddleware, createSoundWithUpload);
// Get all sounds route
router.get(
  "/getSounds",
  authMiddleware,
  checkProStatus,
  soundController.getSounds
);
// Get sound by ID route
router.get("/getSingleSound/:id", authMiddleware, soundController.getSoundById);
// Check upload status route
router.get("/upload-status/:id", authMiddleware, soundController.getUploadStatus);
// Update sound route
router.put("/updateSound/:id", authMiddleware, soundController.updateSound);
// Delete sound route
router.delete("/deleteSound/:id", authMiddleware, soundController.deleteSound);
// Get popular today songs route
router.get(
  "/popular-today",
  authMiddleware,
  soundController.getPopularTodaySongs
);

router.post("/play", authMiddleware, soundController.logPlayedSound);

// Get recently played sounds for a user
router.get(
  "/recently-played/:userId",
  authMiddleware,
  soundController.getRecentlyPlayedSounds
);

module.exports = router;
