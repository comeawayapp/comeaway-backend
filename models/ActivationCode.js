const mongoose = require("mongoose");

const ActivationCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      minlength: 8,
      maxlength: 8
    },
    productName: { type: String, required: true },
    orderNumber: { type: String, required: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    platform: { type: String, required: true },
    expiresIn: { type: Date, required: true },
    redeemed: { type: Boolean, default: false },
    redeemedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    redeemedAt: { type: Date },
    subscriptionExpiresAt: { type: Date },
    accessCodeSentAt: { type: Date },
    accessCodeSentTo: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model("ActivationCode", ActivationCodeSchema);
