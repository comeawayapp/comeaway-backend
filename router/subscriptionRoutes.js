const express = require("express");
const router = express.Router();
const subscriptionController = require("../controllers/subscriptionController");
const authMiddleware = require("../middleware/auth");

// Create new subscription
router.post("/create", authMiddleware, subscriptionController.createSubscription);

// Get current user's subscription
router.get("/my", authMiddleware, subscriptionController.getMySubscription);

// Detailed subscription fields for the authenticated user
router.get(
  "/me/details",
  authMiddleware,
  subscriptionController.getMySubscriptionDetails
);

// Preference updates (cancellation reason + 2-day reminder opt-in)
router.put(
  "/me/preferences",
  authMiddleware,
  subscriptionController.updateMySubscriptionPreferences
);
router.post(
  "/me/preferences",
  authMiddleware,
  subscriptionController.updateMySubscriptionPreferences
);

// Cancel subscription
router.delete("/:subscriptionId/cancel", authMiddleware, subscriptionController.cancelSubscription);

// Get user's subscription history
router.get("/user/:userId", authMiddleware, subscriptionController.getSubscriptionByUserId);

// Get all subscriptions (Admin)
router.get("/all", authMiddleware, subscriptionController.getAllUserSubscriptionPlansAndStatuses);

// Legacy routes for backward compatibility
router.post("/create-subscription", authMiddleware, subscriptionController.createSubscription);
router.get("/subscription-details/:userId", authMiddleware, subscriptionController.getSubscriptionByUserId);
router.get("/my-subscription", authMiddleware, subscriptionController.getMySubscription);

// Admin routes
router.post("/admin/check-expired", authMiddleware, subscriptionController.checkExpiredSubscriptions);
router.post(
  "/admin/send-expiry-reminders",
  authMiddleware,
  subscriptionController.sendTwoDayExpiryReminders
);
router.post("/admin/create-subscription-for-user", authMiddleware, subscriptionController.createSubscriptionForUser);

module.exports = router;
