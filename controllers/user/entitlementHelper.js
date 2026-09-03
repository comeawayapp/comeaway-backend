const Entitlement = require("../../models/Entitlement");
const User = require("../../models/user");
const emailService = require("../../services/emailService");

function normalizeEmail(email) {
  if (!email || typeof email !== "string") return "";
  return email.toLowerCase().trim();
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Amazon order pending — skip auto-redeem until /match sets real email */
function isAmazonPendingEmail(email) {
  if (email == null || email === "") return true;
  if (typeof email !== "string") return false;
  return /^amazon_pending_/i.test(email.trim());
}

/** Unredeemed Amazon row still waiting for a real customer email */
function isPendingAmazonAssignment(entitlement) {
  if (!entitlement || entitlement.platform !== "amazon") return false;
  if (entitlement.redeemed) return false;
  return isAmazonPendingEmail(entitlement.assignedTo);
}

/**
 * Find any user by email, case-insensitive (includes soft-deleted).
 */
async function findUserByEmailCI(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  return User.findOne({
    email: { $regex: `^${escapeRegex(normalized)}$`, $options: "i" },
  });
}

/**
 * Find an active (non soft-deleted) user by email, case-insensitive.
 */
async function findActiveUserByEmail(email) {
  const user = await findUserByEmailCI(email);
  if (!user) return null;
  if (user.status === "inactive" && user.deletedAt) return null;
  if (user.deletedAt) return null;
  return user;
}

/**
 * Redeem a specific entitlement for a user and upgrade to PRO.
 * @returns {Promise<Object|null>}
 */
async function redeemEntitlementForUser(entitlement, user, { sendEmail = true } = {}) {
  if (!entitlement || !user) return null;
  if (entitlement.redeemed) return null;
  if (entitlement.expiryDate && entitlement.expiryDate < new Date()) return null;

  const subscriptionExpiry =
    entitlement.expiryDate ||
    new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000);

  entitlement.redeemed = true;
  entitlement.redeemedBy = user._id;
  entitlement.redeemedAt = new Date();
  entitlement.subscriptionExpiresAt = subscriptionExpiry;
  await entitlement.save();

  user.isPro = true;
  user.proExpiresAt = subscriptionExpiry;
  user.activationMode = "code";
  await user.save();

  if (sendEmail) {
    const firstName = user.firstname || "User";
    emailService.sendAccessReadyEmail(user.email, firstName).catch((error) => {
      console.error("Failed to send Access Ready email:", error);
    });
  }

  return {
    entitlementId: entitlement.entitlementId,
    productName: entitlement.productName,
    redeemedAt: entitlement.redeemedAt,
    expiresAt: subscriptionExpiry,
    userId: user._id,
    userUpgraded: true,
  };
}

/**
 * If a user already exists for this entitlement's assignedTo email,
 * redeem immediately and upgrade them to PRO.
 */
async function autoRedeemEntitlementIfUserExists(entitlement) {
  try {
    if (!entitlement || entitlement.redeemed) {
      return { userUpgraded: false, user: null, redeemResult: null };
    }

    if (isAmazonPendingEmail(entitlement.assignedTo)) {
      return { userUpgraded: false, user: null, redeemResult: null };
    }

    const user = await findActiveUserByEmail(entitlement.assignedTo);
    if (!user) {
      return { userUpgraded: false, user: null, redeemResult: null };
    }

    // Already PRO: still redeem entitlement so it isn't left hanging,
    // and extend expiry if entitlement lasts longer.
    if (user.isPro) {
      const subscriptionExpiry =
        entitlement.expiryDate ||
        new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000);

      entitlement.redeemed = true;
      entitlement.redeemedBy = user._id;
      entitlement.redeemedAt = new Date();
      entitlement.subscriptionExpiresAt = subscriptionExpiry;
      await entitlement.save();

      if (
        !user.proExpiresAt ||
        new Date(user.proExpiresAt) < new Date(subscriptionExpiry)
      ) {
        user.proExpiresAt = subscriptionExpiry;
        user.activationMode = user.activationMode || "code";
        await user.save();
      }

      return {
        userUpgraded: false,
        userAlreadyPro: true,
        user,
        redeemResult: {
          entitlementId: entitlement.entitlementId,
          userId: user._id,
          expiresAt: subscriptionExpiry,
        },
      };
    }

    const redeemResult = await redeemEntitlementForUser(entitlement, user);
    return {
      userUpgraded: !!redeemResult,
      user,
      redeemResult,
    };
  } catch (error) {
    console.error("Error in autoRedeemEntitlementIfUserExists:", error);
    return { userUpgraded: false, user: null, redeemResult: null, error: error.message };
  }
}

/**
 * Check for unredeemed entitlement assigned to email and automatically redeem it
 * This is called during login/signup for standard users only
 * @param {string} email - User's email address
 * @param {string} userId - User's ID
 * @returns {Promise<Object|null>} - Returns entitlement info if redeemed, null otherwise
 */
async function checkAndRedeemEntitlement(email, userId) {
  try {
    const user = await User.findById(userId);
    if (!user || user.isPro) {
      return null;
    }

    const entitlement = await Entitlement.findOne({
      assignedTo: normalizeEmail(email),
      redeemed: false,
      expiryDate: { $gt: new Date() },
    });

    if (!entitlement) {
      return null;
    }

    return redeemEntitlementForUser(entitlement, user);
  } catch (error) {
    console.error("Error in checkAndRedeemEntitlement:", error);
    return null;
  }
}

module.exports = {
  normalizeEmail,
  isAmazonPendingEmail,
  isPendingAmazonAssignment,
  findUserByEmailCI,
  findActiveUserByEmail,
  redeemEntitlementForUser,
  autoRedeemEntitlementIfUserExists,
  checkAndRedeemEntitlement,
};
