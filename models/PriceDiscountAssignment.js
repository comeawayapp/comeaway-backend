const mongoose = require("mongoose");

const PriceDiscountAssignmentSchema = new mongoose.Schema(
  {
    priceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Price',
      required: true
    },
    discountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Discount',
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    assignedAt: {
      type: Date,
      default: Date.now
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false // Optional, for admin tracking
    }
  },
  { 
    timestamps: true 
  }
);

// Compound index to ensure unique price-discount combinations
PriceDiscountAssignmentSchema.index({ priceId: 1, discountId: 1 }, { unique: true });

module.exports = mongoose.model("PriceDiscountAssignment", PriceDiscountAssignmentSchema);
