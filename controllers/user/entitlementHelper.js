const Entitlement = require("../../models/Entitlement");
const User = require("../../models/user");
const emailService = require("../../services/emailService");

/**
 * Check for unredeemed entitlement assigned to email and automatically redeem it
 * This is called during login/signup for standard users only
 * @param {string} email - User's email address
 * @param {string} userId - User's ID
 * @returns {Promise<Object|null>} - Returns entitlement info if redeemed, null otherwise
 */
async function checkAndRedeemEntitlement(email, userId) {
  try {
    // Only check for standard users (not already PRO)
    const user = await User.findById(userId);
    if (!user || user.isPro) {
      return null; // User doesn't exist or is already PRO
    }

    // Find unredeemed, non-expired entitlement assigned to this email
    const entitlement = await Entitlement.findOne({
      assignedTo: email.toLowerCase().trim(),
      redeemed: false,
      expiryDate: { $gt: new Date() } // Not expired
    });

    if (!entitlement) {
      return null; // No entitlement found
    }

    // Mark entitlement as redeemed
    entitlement.redeemed = true;
    entitlement.redeemedBy = userId;
    entitlement.redeemedAt = new Date();
    
    // Set subscription expiry to entitlement's expiry date (or 5 years from now if not set)
    const subscriptionExpiry = entitlement.expiryDate || new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000);
    entitlement.subscriptionExpiresAt = subscriptionExpiry;
    
    await entitlement.save();

    // Upgrade user to PRO
    user.isPro = true;
    user.proExpiresAt = subscriptionExpiry;
    user.activationMode = "code"; // Mark as activated via entitlement/code
    await user.save();

    // Send "Access Ready" email (non-blocking)
    const firstName = user.firstname || "User";
    emailService.sendAccessReadyEmail(user.email, firstName).catch((error) => {
      console.error("Failed to send Access Ready email:", error);
    });

    return {
      entitlementId: entitlement.entitlementId,
      productName: entitlement.productName,
      redeemedAt: entitlement.redeemedAt,
      expiresAt: subscriptionExpiry
    };
  } catch (error) {
    console.error("Error in checkAndRedeemEntitlement:", error);
    return null; // Fail silently - don't block login/signup
  }
}

module.exports = {
  checkAndRedeemEntitlement
};

