const mongoose = require("mongoose");

const PriceSchema = new mongoose.Schema(
  {
    planType: {
      type: String,
      required: true,
      enum: ['monthly', 'annual', 'daily'],
      unique: true
    },
    basePrice: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      required: true,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'NGN']
    },
    isActive: {
      type: Boolean,
      default: true
    },
    description: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Price", PriceSchema);
