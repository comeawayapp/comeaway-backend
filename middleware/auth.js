const jwt = require("jsonwebtoken");
const User = require("../models/user");
const logger = require("../utils/logger");

module.exports = async function (req, res, next) {
  const token = req.header("Authorization");

  if (!token) {
    logger.error('No authorization token provided', {
      path: req.path,
      method: req.method
    });
    return res.status(401).json({ message: "Access denied" });
  }

  try {
    const decoded = jwt.verify(
      token.replace("Bearer ", ""),
      process.env.JWT_SECRET
    );
    req.user = decoded;

    // Check if user still exists and is active
    const currentUser = await User.findById(decoded._id);
    if (!currentUser) {
      logger.error('User not found in database', { 
        userId: decoded._id,
        path: req.path 
      });
      return res.status(403).json({
        message: "User account not found",
        code: "USER_NOT_FOUND",
        action: "LOGOUT_REQUIRED",
      });
    }

    // Check if user account is deactivated
    if (currentUser.status === "inactive" || currentUser.status === "deleted" ) {
      logger.error('User account is deactivated', { 
        userId: decoded._id,
        status: currentUser.status,
        path: req.path 
      });
      return res.status(403).json({
        message: "Your account has been deactivated. Please contact support.",
        code: "ACCOUNT_DEACTIVATED",
        action: "LOGOUT_REQUIRED",
      });
    }

    next();
  } catch (err) {
    logger.error('JWT verification failed', {
      error: err.message,
      path: req.path
    });
    res.status(400).json({ message: "Invalid token" });
  }
};
