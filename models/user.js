const mongoose = require("mongoose");

const STAFF_ROLES = ["owner", "admin", "content_manager"];

const UserSchema = new mongoose.Schema(
  {
    firstname: { type: String, required: true },
    lastname: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phoneNumber: { type: String },
    // Staff role; customers use null
    role: {
      type: String,
      enum: {
        values: ["owner", "admin", "content_manager", null],
        message: "{VALUE} is not a valid role",
      },
      default: null,
    },
    accountType: {
      type: String,
      enum: ["standard", "pro", "team_member"],
      default: "standard",
    },
    teamDateAdded: { type: Date, default: null },
    inviteToken: { type: String },
    inviteTokenExpires: { type: Date },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    activationMode: { type: String, enum: ["code", "card"], default: null },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    activeResetToken: { type: String },
    resetTokenExpires: { type: Date },
    emailVerificationOTP: { type: String },
    emailVerificationExpires: { type: Date },
    isEmailVerified: { type: Boolean, default: false },
    isPro: { type: Boolean, default: false },
    proExpiresAt: { type: Date },
    profileUpdateCount: { type: Number, default: 0 },
    profileLastUpdated: { type: Date },
    requestDeletionOTP: { type: String },
    requestDeletionExpires: { type: Date },
    deletedAt: { type: Date },
    deletionReason: { type: String },
    stripeCustomerId: { type: String, unique: true, sparse: true },
    stripeSubscriptionId: { type: String },
    subscriptionStatus: {
      type: String,
      enum: [
        "active",
        "canceled",
        "past_due",
        "unpaid",
        "incomplete",
        "trialing",
      ],
      default: null,
    },
    subscriptionCurrentPeriodEnd: { type: Date },
    proUpdatedBy: {
      type: String,
    },
    appleId: { type: String },
    authProvider: {
      type: String,
      enum: ["email", "google", "facebook", "apple"],
      default: "email",
    },
  },
  {
    timestamps: true,
  }
);

UserSchema.statics.STAFF_ROLES = STAFF_ROLES;

UserSchema.methods.isStaff = function () {
  return STAFF_ROLES.includes(this.role);
};

// Coerce legacy customer role strings so saves don't fail enum validation
UserSchema.pre("validate", function (next) {
  if (this.role === "user" || this.role === "" || this.role === undefined) {
    this.role = null;
  }
  next();
});

module.exports = mongoose.model("User", UserSchema);
