const user = require("../../models/user");
const { logProfileUpdate } = require("../../utils/profileLogger");
const {
  validateProfileData,
  sanitizeInput,
  checkProfileUpdateRateLimit,
  checkAndUpdateProStatus,
} = require("./helpers");

// Get Current User Profile
exports.getCurrentUserProfile = async (req, res) => {
  try {
    // Get user ID from JWT token (set by auth middleware)
    const userId = req.user._id;

    // Find user and exclude sensitive fields
    let gotuser = await user
      .findById(userId)
      .select(
        "-password -resetPasswordToken -resetPasswordExpires -activeResetToken -resetTokenExpires -emailVerificationOTP -emailVerificationExpires -profileUpdateCount -profileLastUpdated"
      );

    if (!gotuser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Downgrade if proExpiresAt has passed
    gotuser = await checkAndUpdateProStatus(gotuser);

    // Determine user type and activation method
    const userType = gotuser.isPro ? "Pro" : "Standard";
    const activationMethod = gotuser.activationMode || "None";

    res.status(200).json({
      success: true,
      message: "Profile retrieved successfully",
      user: {
        _id: gotuser._id,
        firstname: gotuser.firstname,
        lastname: gotuser.lastname,
        email: gotuser.email,
        phoneNumber: gotuser.phoneNumber || "",
        role: gotuser.role || null,
        accountType:
          gotuser.accountType || (gotuser.isPro ? "pro" : "standard"),
        status: gotuser.status,
        isEmailVerified: gotuser.isEmailVerified,
        isPro: gotuser.isPro,
        proExpiresAt: gotuser.proExpiresAt,
        userType: userType,
        activationMethod: activationMethod,
        createdAt: gotuser.createdAt,
        updatedAt: gotuser.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error in getCurrentUserProfile:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Update User Profile
exports.updateUserProfile = async (req, res) => {
  try {
    // Get user ID from JWT token (set by auth middleware)
    const userId = req.user._id;
    const { firstname, lastname, phoneNumber } = req.body;

    // Find the user
    const gotuser = await user.findById(userId);
    if (!gotuser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check rate limiting
    const rateLimitCheck = checkProfileUpdateRateLimit(gotuser);
    if (!rateLimitCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: `Too many profile updates. Please try again in ${rateLimitCheck.timeUntilReset} minutes.`,
        retryAfter: rateLimitCheck.timeUntilReset,
      });
    }

    // Sanitize input data
    const sanitizedFirstname = sanitizeInput(firstname);
    const sanitizedLastname = sanitizeInput(lastname);
    const sanitizedPhoneNumber = phoneNumber ? sanitizeInput(phoneNumber) : "";

    // Validate the input data
    const validationErrors = validateProfileData(
      sanitizedFirstname,
      sanitizedLastname,
      sanitizedPhoneNumber
    );
    if (validationErrors.length > 0) {
      await logProfileUpdate(
        userId,
        gotuser.email,
        "PROFILE_UPDATE_VALIDATION_FAILED",
        false,
        `Validation errors: ${validationErrors.join(", ")}`
      );
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    // Update user profile
    gotuser.firstname = sanitizedFirstname;
    gotuser.lastname = sanitizedLastname;
    gotuser.phoneNumber = sanitizedPhoneNumber;

    // Update rate limiting fields
    if (rateLimitCheck.resetCount) {
      gotuser.profileUpdateCount = 1;
    } else {
      gotuser.profileUpdateCount = (gotuser.profileUpdateCount || 0) + 1;
    }
    gotuser.profileLastUpdated = new Date();

    // Save the updated user
    await gotuser.save();

    // Log the profile update for audit purposes
    await logProfileUpdate(
      userId,
      gotuser.email,
      "PROFILE_UPDATE",
      true,
      `Updated: firstname, lastname${sanitizedPhoneNumber ? ", phoneNumber" : ""}`
    );

    // Return the updated user profile (excluding sensitive data)
    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        _id: gotuser._id,
        firstname: gotuser.firstname,
        lastname: gotuser.lastname,
        email: gotuser.email,
        phoneNumber: gotuser.phoneNumber || "",
        role: gotuser.role || null,
        accountType:
          gotuser.accountType || (gotuser.isPro ? "pro" : "standard"),
        status: gotuser.status,
        isEmailVerified: gotuser.isEmailVerified,
        isPro: gotuser.isPro,
        proExpiresAt: gotuser.proExpiresAt,
        createdAt: gotuser.createdAt,
        updatedAt: gotuser.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error in updateUserProfile:", error);
    // Log the error for audit purposes (use userId from token if available)
    if (req.user && req.user._id) {
      await logProfileUpdate(
        req.user._id,
        "unknown",
        "PROFILE_UPDATE_SERVER_ERROR",
        false,
        `Server error: ${error.message}`
      );
    }
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

