const mongoose = require("mongoose");

const EntitlementSchema = new mongoose.Schema(
  {
    entitlementId: {
      type: String,
      required: true,
      unique: true,
      minlength: 6,
      maxlength: 6,
    },
    productName: { type: String, required: true },
    orderNumber: { type: String, required: true },
    customerName: { type: String, required: false },
    // Nullable for Amazon orders before Klaviyo match
    customerEmail: {
      type: String,
      required: false,
      default: null,
      lowercase: true,
      trim: true,
    },
    // Email of who gets the entitlement (buyer or gift recipient); null until Amazon match
    assignedTo: {
      type: String,
      required: false,
      default: null,
      lowercase: true,
      trim: true,
    },
    platform: {
      type: String,
      required: true,
      enum: ["shopify", "amazon", "google_play", "apple_iap", "stripe", "other"],
    },
    // 1-based unit position within an order for idempotent automation sync
    syncUnitIndex: {
      type: Number,
      min: 1,
      default: null,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    redeemed: { type: Boolean, default: false },
    redeemedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    redeemedAt: { type: Date },
    subscriptionExpiresAt: { type: Date },
    accessEmailSentAt: { type: Date },
    accessEmailSentTo: { type: String },
    notes: { type: String, required: false },
  },
  { timestamps: true }
);

EntitlementSchema.index({ orderNumber: 1 });
EntitlementSchema.index(
  { platform: 1, orderNumber: 1, syncUnitIndex: 1 },
  {
    unique: true,
    partialFilterExpression: {
      syncUnitIndex: { $type: "number" },
    },
  }
);

// Auto-set expiryDate to 5 years from creation if not provided
EntitlementSchema.pre("save", function (next) {
  if (!this.expiryDate) {
    const fiveYearsFromNow = new Date();
    fiveYearsFromNow.setFullYear(fiveYearsFromNow.getFullYear() + 5);
    this.expiryDate = fiveYearsFromNow;
  }
  // Normalize empty strings to null for pending Amazon emails
  if (this.customerEmail === "") this.customerEmail = null;
  if (this.assignedTo === "") this.assignedTo = null;
  next();
});

module.exports = mongoose.model("Entitlement", EntitlementSchema);
