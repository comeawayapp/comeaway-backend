const express = require("express");
const router = express.Router();
const discountController = require("../controllers/discountController");
const authMiddleware = require("../middleware/auth");

// Create new discount (Admin only)
router.post(
  "/create",
  authMiddleware,
  discountController.createDiscount
);

// Get all discounts
router.get(
  "/all",
  discountController.getAllDiscounts
);

// Get active discounts
router.get(
  "/active",
  discountController.getActiveDiscounts
);

// Get discount by ID
router.get(
  "/:id",
  discountController.getDiscountById
);

// Update discount (Admin only)
router.put(
  "/:id",
  authMiddleware,
  discountController.updateDiscount
);

// Delete discount (Admin only)
router.delete(
  "/:id",
  authMiddleware,
  discountController.deleteDiscount
);

// Apply discount to price
router.post(
  "/apply",
  discountController.applyDiscount
);

module.exports = router;
