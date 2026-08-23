const express = require("express");
const router = express.Router();
const soundController = require("../controllers/soundController");
const authMiddleware = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const { checkProStatus } = require("../middleware/index");

const contentWrite = requireRole("owner", "admin", "content_manager");
const contentDelete = requireRole("owner", "admin");

// Create / update: Owner, Admin, Content Manager
router.post(
  "/add-sounds",
  authMiddleware,
  contentWrite,
  soundController.createSound
);
router.put(
  "/updateSound/:id",
  authMiddleware,
  contentWrite,
  soundController.updateSound
);
// Delete: Owner, Admin only
router.delete(
  "/deleteSound/:id",
  authMiddleware,
  contentDelete,
  soundController.deleteSound
);

// App / shared reads (any authenticated user)
router.get(
  "/getSounds",
  authMiddleware,
  checkProStatus,
  soundController.getSounds
);
router.get("/getSingleSound/:id", authMiddleware, soundController.getSoundById);
router.get("/upload-status/:id", authMiddleware, soundController.getUploadStatus);
router.get(
  "/popular-today",
  authMiddleware,
  soundController.getPopularTodaySongs
);
router.post("/play", authMiddleware, soundController.logPlayedSound);
router.get(
  "/recently-played/:userId",
  authMiddleware,
  soundController.getRecentlyPlayedSounds
);

module.exports = router;
