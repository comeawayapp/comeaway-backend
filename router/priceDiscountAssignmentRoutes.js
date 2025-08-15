const express = require("express");
const router = express.Router();
const priceDiscountAssignmentController = require("../controllers/priceDiscountAssignmentController");
const authMiddleware = require("../middleware/auth");

// Assign a discount to a price (Admin only)
router.post(
  "/assign",
  authMiddleware,
  priceDiscountAssignmentController.assignDiscountToPrice
);

// Remove a discount assignment from a price (Admin only)
router.put(
  "/remove/:priceId/:discountId",
  authMiddleware,
  priceDiscountAssignmentController.removeDiscountFromPrice
);

// Get all assignments for a specific price
router.get(
  "/price/:priceId",
  priceDiscountAssignmentController.getAssignmentsForPrice
);

// Get all active assignments
router.get(
  "/all",
  priceDiscountAssignmentController.getAllAssignments
);

module.exports = router;
