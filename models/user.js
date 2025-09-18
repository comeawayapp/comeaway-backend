const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    firstname: { type: String, required: true },
    lastname: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phoneNumber: { type: String }, // Added for profile updates
    role: { type: String },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    activationMode: { type: String, enum: ["code", "card"], default: null },
    resetPasswordToken: { type: String }, // Added field for OTP
    resetPasswordExpires: { type: Date }, // Added field for OTP expiration
    activeResetToken: { type: String }, // JWT reset token after OTP verification
    resetTokenExpires: { type: Date }, // JWT reset token expiration
    emailVerificationOTP: { type: String }, // OTP for email verification
    emailVerificationExpires: { type: Date }, // OTP expiration time
    isEmailVerified: { type: Boolean, default: false }, // Email verification status
    isPro: { type: Boolean, default: false }, // Pro subscription status
    proExpiresAt: { type: Date }, // Pro subscription expiry
    profileUpdateCount: { type: Number, default: 0 }, // Track profile updates for rate limiting
    profileLastUpdated: { type: Date }, // Track last profile update for rate limiting
    requestDeletionOTP: { type: String }, // OTP for account deletion request
    requestDeletionExpires: { type: Date }, // Account deletion OTP expiration time
    deletedAt: { type: Date }, // Soft delete timestamp
    deletionReason: { type: String }, // Reason for account deletion
    stripeCustomerId: { type: String }, // Stripe customer ID
    appleId: { type: String }, // Apple Sign In ID
    authProvider: { type: String, enum: ["email", "google", "facebook", "apple"], default: "email" }, // Authentication provider
  },
  {
    timestamps: true, // This adds createdAt and updatedAt automatically
  }
);

module.exports = mongoose.model("User", UserSchema);
