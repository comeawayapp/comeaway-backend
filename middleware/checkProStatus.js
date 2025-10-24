const user = require("../models/user");

// Helper to check and update Pro status (reuse the robust logic)
async function checkAndUpdateProStatus(userDoc) {
  let expired = false;
  if (userDoc.isPro) {
    if (
      !userDoc.proExpiresAt ||
      isNaN(new Date(userDoc.proExpiresAt).getTime())
    ) {
      expired = true;
    } else {
      const now = new Date();
      console.log(now,"now");
      console.log(userDoc.proExpiresAt,"userDoc.proExpiresAt");
      const expiry = new Date(userDoc.proExpiresAt);
      if (expiry.getTime() < now.getTime()) {
        expired = true;
      }
    }
  }
  if (userDoc.isPro && expired) {
    userDoc.isPro = false;
    await userDoc.save();
  }
  return userDoc;
}

// Middleware to check/update Pro status for authenticated user
module.exports = async function checkProStatusMiddleware(req, res, next) {
  try {
    // Assumes req.user._id is set by your auth middleware (e.g., after JWT verification)
    if (!req.user || !req.user._id) {
      return next(); // Not authenticated, skip
    }
    let gotuser = await user.findById(req.user._id);
    if (gotuser) {
      await checkAndUpdateProStatus(gotuser);
    }
    return next();
  } catch (err) {
    // Log error but don't block the request
    console.error("Error in Pro status middleware:", err);
    return next();
  }
};
