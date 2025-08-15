const express = require("express");
const router = express.Router();
const subscriptionController = require("../controllers/subscriptionController");
const authMiddleware = require("../middleware/auth");

// Main subscription route - automatically sets isPro = true when subscription is active
router.post(
  "/create-subscription",
  authMiddleware,
  subscriptionController.createSubscription
);

// Get subscription info
router.get(
  "/subscription-details/:userId",
  authMiddleware,
  subscriptionController.getSubscriptionByUserId
);
router.get(
  "/my-subscription",
  authMiddleware,
  subscriptionController.getMySubscription
);

// Admin routes
router.get(
  "/admin/all-subscriptions",
  authMiddleware,
  subscriptionController.getAllUserSubscriptionPlansAndStatuses
);
router.post(
  "/admin/check-expired",
  authMiddleware,
  subscriptionController.checkExpiredSubscriptions
);
router.post(
  "/admin/create-subscription-for-user",
  authMiddleware,
  subscriptionController.createSubscriptionForUser
);

module.exports = router;
