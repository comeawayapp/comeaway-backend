const user = require("../models/user");
const { checkAndUpdateProStatus } = require("../controllers/user/helpers");

// Middleware to check/update Pro status for authenticated user
module.exports = async function checkProStatusMiddleware(req, res, next) {
  try {
    // Assumes req.user._id is set by auth middleware (e.g., after JWT verification)
    if (!req.user || !req.user._id) {
      return next();
    }
    const gotuser = await user.findById(req.user._id);
    if (gotuser) {
      await checkAndUpdateProStatus(gotuser);
    }
    return next();
  } catch (err) {
    console.error("Error in Pro status middleware:", err);
    return next();
  }
};
