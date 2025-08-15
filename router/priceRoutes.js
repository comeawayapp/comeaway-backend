const express = require("express");
const router = express.Router();
const priceController = require("../controllers/priceController");
const authMiddleware = require("../middleware/auth");

// Create new price (Admin only)
router.post(
  "/create",
  authMiddleware,
  priceController.createPrice
);

// Get all prices
router.get(
  "/all",
  priceController.getAllPrices
);

// Get price by plan type
router.get(
  "/plan/:planType",
  priceController.getPriceByPlan
);

// Get price with available discounts (no automatic application)
router.get(
  "/plan/:planType/with-available-discounts",
  priceController.getPriceWithAvailableDiscounts
);

// Apply discount to price manually (using coupon code)
router.post(
  "/apply-discount",
  priceController.applyDiscountToPrice
);

// Update price (Admin only)
router.put(
  "/plan/:planType",
  authMiddleware,
  priceController.updatePrice
);

module.exports = router;
