const express = require("express");
const router = express.Router();
const badgeController = require("../controllers/badgeController");
const authMiddleware = require("../middleware/auth");

// Badge progress route
router.get("/badge-progress", authMiddleware, badgeController.getBadgeProgress);

module.exports = router;
