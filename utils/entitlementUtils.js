const Entitlement = require("../models/Entitlement");
const User = require("../models/user");

const VALID_PLATFORMS = [
  "shopify",
  "amazon",
  "google_play",
  "apple_iap",
  "stripe",
  "other",
];

function normalizePlatform(platform) {
  if (!platform || typeof platform !== "string") return null;
  const lower = platform.toLowerCase().trim();
  if (lower.startsWith("amazon")) return "amazon";
  if (lower.startsWith("shopify")) return "shopify";
  if (VALID_PLATFORMS.includes(lower)) return lower;
  return null;
}

async function generateUniqueEntitlementId() {
  let entitlementId;
  let attempts = 0;
  const maxAttempts = 100;

  do {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    entitlementId = "";
    for (let i = 0; i < 6; i++) {
      entitlementId += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const exists = await Entitlement.findOne({ entitlementId });
    if (!exists) return entitlementId;

    attempts++;
  } while (attempts < maxAttempts);

  throw new Error("Unable to generate unique entitlement ID");
}

function defaultExpiryDate(expiryDateInput) {
  if (expiryDateInput) {
    const parsed = new Date(expiryDateInput);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  const fiveYears = new Date();
  fiveYears.setFullYear(fiveYears.getFullYear() + 5);
  return fiveYears;
}

/**
 * Sync linked user's PRO status when entitlement expiry changes (refunds).
 */
async function syncUserProFromEntitlementExpiry(entitlement, newExpiry) {
  if (!entitlement.redeemed || !entitlement.redeemedBy) {
    return null;
  }

  const user = await User.findById(entitlement.redeemedBy);
  if (!user) return null;

  const now = new Date();
  user.proExpiresAt = newExpiry;

  if (newExpiry.getTime() > now.getTime()) {
    user.isPro = true;
    user.activationMode = user.activationMode || "code";
  } else {
    user.isPro = false;
    user.activationMode = null;
  }

  await user.save();
  return {
    userId: user._id,
    isPro: user.isPro,
    proExpiresAt: user.proExpiresAt,
  };
}

module.exports = {
  VALID_PLATFORMS,
  normalizePlatform,
  generateUniqueEntitlementId,
  defaultExpiryDate,
  syncUserProFromEntitlementExpiry,
};
