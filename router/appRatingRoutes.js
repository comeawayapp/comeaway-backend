const express = require("express");
const router = express.Router();
const appRatingController = require("../controllers/appRatingController");
const authMiddleware = require("../middleware/auth"); // Assuming you have an auth middleware to verify JWT

// Create a new app rating and feedback
router.post("/create", authMiddleware, appRatingController.createAppRating);

// Get all app ratings and feedback
router.get("/all", authMiddleware, appRatingController.getAllAppRatings);

// Get app ratings and feedback by user
//router.get("/user", authMiddleware, appRatingController.getAppRatingsByUser);

module.exports = router;