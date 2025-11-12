const mongoose = require("mongoose");

const EntitlementSchema = new mongoose.Schema(
  {
    entitlementId: {
      type: String,
      required: true,
      unique: true,
      minlength: 6,
      maxlength: 6
    },
    productName: { type: String, required: true },
    orderNumber: { type: String, required: true },
    customerName: { type: String, required: false }, // Optional
    customerEmail: { type: String, required: true },
    assignedTo: { 
      type: String, 
      required: true,
      lowercase: true,
      trim: true
    }, // Email of who gets the entitlement (buyer or gift recipient)
    platform: { 
      type: String, 
      required: true,
      enum: ['shopify', 'amazon', 'google_play', 'apple_iap', 'stripe', 'other']
    },
    expiryDate: { 
      type: Date, 
      required: true 
    },
    redeemed: { type: Boolean, default: false },
    redeemedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    redeemedAt: { type: Date },
    subscriptionExpiresAt: { type: Date },
    accessEmailSentAt: { type: Date }, // Replaces accessCodeSentAt
    accessEmailSentTo: { type: String }, // Replaces accessCodeSentTo
    notes: { type: String, required: false } // Internal notes
  },
  { timestamps: true }
);

// Auto-set expiryDate to 5 years from creation if not provided
EntitlementSchema.pre('save', function(next) {
  if (!this.expiryDate) {
    const fiveYearsFromNow = new Date();
    fiveYearsFromNow.setFullYear(fiveYearsFromNow.getFullYear() + 5);
    this.expiryDate = fiveYearsFromNow;
  }
  next();
});

module.exports = mongoose.model("Entitlement", EntitlementSchema);

