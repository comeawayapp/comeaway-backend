const express = require("express");
const router = express.Router();
const narratorController = require("../controllers/narratorController");
const authMiddleware = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

const contentWrite = requireRole("owner", "admin", "content_manager");

router.get("/all", narratorController.getAllNarrators);
router.post(
  "/create",
  authMiddleware,
  contentWrite,
  narratorController.createNarrator
);

module.exports = router;
