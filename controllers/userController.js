const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const user = require("../models/user");
const emailService = require("../services/emailService");
const { logProfileUpdate } = require("../utils/profileLogger");

// Helper to check and update Pro status
async function checkAndUpdateProStatus(userDoc) {
  // Defensive: ensure proExpiresAt is a valid date
  let expired = false;
  let activationCodeExpired = false;
  
  if (userDoc.isPro) {
    // Check subscription expiry
    if (
      !userDoc.proExpiresAt ||
      isNaN(new Date(userDoc.proExpiresAt).getTime())
    ) {
      // No expiry date or invalid date: treat as expired
      expired = true;
    } else {
      // Compare using UTC to avoid timezone issues
      const now = new Date();
      const expiry = new Date(userDoc.proExpiresAt);
      if (expiry.getTime() < now.getTime()) {
        expired = true;
      }
    }
    
    // Check activation code expiry if user was activated by code
    if (userDoc.activationMode === 'code' && userDoc.proExpiresAt) {
      const now = new Date();
      const codeExpiry = new Date(userDoc.proExpiresAt);
      if (codeExpiry.getTime() < now.getTime()) {
        activationCodeExpired = true;
      }
    }
  }
  
  // Downgrade to standard user if either subscription or activation code expired
  if (userDoc.isPro && (expired || activationCodeExpired)) {
    userDoc.isPro = false;
    userDoc.activationMode = null; // Clear activation mode when expired
    await userDoc.save();
  }
  
  return userDoc;
}

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    // Check if the user exists
    let gotuser = await user.findOne({ email });
    if (!gotuser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user is soft deleted
    if (gotuser.status === "inactive" && gotuser.deletedAt) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    // Check if the password is correct
    const isMatch = await bcrypt.compare(password, gotuser.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check if email is verified
    if (!gotuser.isEmailVerified) {
      return res.status(401).json({
        message: "Please verify your email address before logging in",
        requiresVerification: true,
        email: gotuser.email,
      });
    }

    // Check and update Pro status
    gotuser = await checkAndUpdateProStatus(gotuser);

    // Create a JWT token
    const token = jwt.sign({ _id: gotuser._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });
    // Determine user type and activation method
    const userType = gotuser.isPro ? "Pro" : "Standard";
    const activationMethod = gotuser.activationMode || "None";
    
    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        _id: gotuser._id,
        firstname: gotuser.firstname,
        lastname: gotuser.lastname,
        email: gotuser.email,
        phoneNumber: gotuser.phoneNumber || "",
        role: gotuser.role,
        isEmailVerified: gotuser.isEmailVerified,
        isPro: gotuser.isPro,
        proExpiresAt: gotuser.proExpiresAt,
        userType: userType,
        activationMethod: activationMethod,
      },
    });

    // res.status(200).json({ token,gotuser });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
exports.googleSignIn = async (req, res) => {
  try {
    const { idToken, user: googleUser } = req.body; // Extract data from the request body
    console.log(idToken, googleUser, "Google User");

    // Extract user information from the Google response
    const { email, givenName, familyName, photo } = googleUser;

    // Check if a user with this email already exists in the database
    let existingUser = await user.findOne({ email });

    if (!existingUser) {
      // Create a new user if one does not exist
      const newUser = new user({
        firstname: givenName,
        lastname: familyName,
        email,
        password: "12345678", // Leave password empty for Google sign-ins
        role: "user", // Default role
        status: "active", // Default status
        photo, // Save the photo URL
      });

      existingUser = await newUser.save();
      console.log("New user created:", newUser);
    } else {
      // Check if existing user is soft deleted
      if (existingUser.status === "inactive" && existingUser.deletedAt) {
        return res.status(404).json({
          message: "User not found"
        });
      }
      console.log("Existing user found:", existingUser);
    }

    // Generate a JWT token for the user
    const token = jwt.sign({ _id: existingUser._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    // Respond with the user data and token
    res.status(200).json({
      message: "Google Sign-In successful",
      token,
      user: {
        _id: existingUser._id,
        firstname: existingUser.firstname,
        lastname: existingUser.lastname,
        email: existingUser.email,
        phoneNumber: existingUser.phoneNumber || "",
        photo: existingUser.photo, // Include photo if available
      },
    });

    // Call the migration function
    // await migrateSocialAuthUserToUserCollection();
  } catch (error) {
    console.error("Error in Google Sign-In:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.facebookSignIn = async (req, res) => {
  try {
    const { _tokenResponse } = req.body; // Extract the response from the request body
    const { email, firstName, lastName, photoUrl: photo } = _tokenResponse;

    console.log("Facebook Sign-In Data:", firstName);

    // Check if a user with this email already exists in the database
    let existingUser = await user.findOne({ email });

    if (!existingUser) {
      // Create a new user if one does not exist
      const newUser = new user({
        firstname: firstName,
        lastname: lastName,
        email,
        password: "12345678",
        role: "user", // Default role
        status: "active", // Default status
        photo, // Save the photo URL
      });

      existingUser = await newUser.save();
      console.log("New user created:", newUser);
    } else {
      // Check if existing user is soft deleted
      if (existingUser.status === "inactive" && existingUser.deletedAt) {
        return res.status(404).json({
          message: "User not found"
        });
      }
      console.log("Existing user found:", existingUser);
    }

    // Generate a JWT token for the user
    const token = jwt.sign({ _id: existingUser._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    // Respond with the user data and token
    res.status(200).json({
      message: "Facebook Sign-In successful",
      token,
      user: {
        _id: existingUser._id,
        firstname: existingUser.firstname,
        lastname: existingUser.lastname,
        email: existingUser.email,
        phoneNumber: existingUser.phoneNumber || "",
        photo: existingUser.photo, // Include photo if available
      },
    });
    // Call the migration function
    // await migrateSocialAuthUserToUserCollection();
  } catch (error) {
    console.error("Error in Facebook Sign-In:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Signup
exports.signup = async (req, res) => {
  try {
    const { firstname, lastname, email, password } = req.body;
    if (!firstname || !lastname || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if user already exists and is verified
    const existingUser = await user.findOne({ email });
    if (existingUser && existingUser.isEmailVerified) {
      return res
        .status(409)
        .json({ message: "Email already exists and is verified" });
    }

    // Generate 4-digit OTP
    const generateRandomOTP = () => {
      return Math.floor(1000 + Math.random() * 9000);
    };

    const otp = generateRandomOTP();
    const hashedPassword = await bcrypt.hash(password, 10);

    if (existingUser && !existingUser.isEmailVerified) {
      // Update existing unverified user
      existingUser.firstname = firstname;
      existingUser.lastname = lastname;
      existingUser.password = hashedPassword;
      existingUser.emailVerificationOTP = otp.toString();
      existingUser.emailVerificationExpires = new Date(
        Date.now() + 15 * 60 * 1000
      ); // 15 minutes
      await existingUser.save();
    } else {
      // Create new user
      const newUser = new user({
        firstname,
        lastname,
        email,
        password: hashedPassword,
        emailVerificationOTP: otp.toString(),
        emailVerificationExpires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        isEmailVerified: false,
      });
      await newUser.save();
    }

    // Send verification OTP email
    try {
      await emailService.sendVerificationOTP(email, firstname, otp);
      res.status(200).json({
        message:
          "Verification OTP sent to your email. Please verify to complete registration.",
        email: email,
      });
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      res.status(500).json({
        message:
          "User created but failed to send verification email. Please try resending OTP.",
      });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Forgot Password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email input
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Find the user by email
    const gotuser = await user.findOne({ email });
    console.log(gotuser, "Gotuser");

    if (!gotuser) {
      return res.status(404).json({ message: "User not found" });
    }
    console.log(gotuser, "Gotuser");

    // Generate a 4-digit OTP
    const generateRandomOTP = () => {
      return Math.floor(1000 + Math.random() * 9000); // Generates a random integer between 1000 and 9999
    };

    const otp = generateRandomOTP();
    gotuser.resetPasswordToken = otp.toString(); // Save OTP as a string
    gotuser.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // Expiry set to 15 minutes from now

    // Clear any existing reset tokens to ensure clean state
    gotuser.activeResetToken = undefined;
    gotuser.resetTokenExpires = undefined;

    // DEBUG: Log values before saving
    console.log("Generated OTP:", otp);
    console.log("Expiry Time:", gotuser.resetPasswordExpires);

    try {
      // Save the user with the OTP and expiry fields
      await gotuser.save();

      // DEBUG: Confirm the user was saved successfully
      console.log("User saved successfully with OTP and expiry.");
    } catch (saveError) {
      console.error("Error saving user:", saveError);
      return res
        .status(500)
        .json({ message: "Failed to save OTP in the database" });
    }

    // Send the OTP via email
    const emailResult = await emailService.sendPasswordResetOTP(email, otp);

    if (!emailResult.success) {
      console.error("Error sending email:", emailResult.error);
      return res.status(500).json({
        message: "Failed to send OTP email",
        error: emailResult.error,
      });
    }

    return res
      .status(200)
      .json({ message: "OTP sent to your email for password reset" });
  } catch (err) {
    console.error("Error in forgotPassword:", err);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
};
// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) {
      return res
        .status(400)
        .json({ message: "resetToken and newPassword are required" });
    }

    // Validate password strength (optional but recommended)
    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
    }

    // Verify the JWT reset token
    let decodedToken;
    try {
      decodedToken = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch (error) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token" });
    }

    // Validate token purpose and find user
    if (decodedToken.purpose !== "password_reset") {
      return res.status(400).json({ message: "Invalid token purpose" });
    }

    const gotuser = await user.findOne({
      _id: decodedToken.userId,
      email: decodedToken.email,
      activeResetToken: resetToken,
      resetTokenExpires: { $gt: Date.now() },
    });

    if (!gotuser) {
      return res
        .status(400)
        .json({ message: "Reset token is invalid or has expired" });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Set the new password and clear reset fields
    gotuser.password = hashedPassword;
    gotuser.activeResetToken = undefined;
    gotuser.resetTokenExpires = undefined;

    await gotuser.save();
    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get All Users with Search and Filtering
exports.getAllUsers = async (req, res) => {
  try {
    const { query, type, activationMethod } = req.query;
    
    // Build the base filter for active users
    let filter = {
      $or: [
        { status: "active" },
        { status: { $exists: false } },
        { deletedAt: { $exists: false } }
      ]
    };
    
    // Add search query filter
    if (query) {
      const searchRegex = new RegExp(query, 'i'); // Case-insensitive search
      filter.$and = [{
        $or: [
          { firstname: searchRegex },
          { lastname: searchRegex },
          { email: searchRegex }
        ]
      }];
    }
    
    // Add user type filter
    if (type) {
      if (!['standard', 'pro'].includes(type.toLowerCase())) {
        return res.status(400).json({
          message: "Invalid user type. Use 'standard' or 'pro'",
          allowedValues: ["standard", "pro"]
        });
      }
      
      if (type.toLowerCase() === 'pro') {
        filter.isPro = true;
      } else {
        filter.isPro = false;
      }
    }
    
    // Add activation method filter
    if (activationMethod) {
      if (!['code', 'card', 'none'].includes(activationMethod.toLowerCase())) {
        return res.status(400).json({
          message: "Invalid activation method. Use 'code', 'card', or 'none'",
          allowedValues: ["code", "card", "none"]
        });
      }
      
      if (activationMethod.toLowerCase() === 'none') {
        filter.$or = filter.$or || [];
        filter.$or.push({ activationMode: { $exists: false } });
        filter.$or.push({ activationMode: null });
      } else {
        filter.activationMode = activationMethod.toLowerCase();
      }
    }
    
    // Execute the query
    const users = await user.find(filter).select("-password");
    
    // Add user type and activation method to each user
    const usersWithType = users.map(userDoc => {
      const userType = userDoc.isPro ? "Pro" : "Standard";
      const activationMethod = userDoc.activationMode || "None";
      
      return {
        ...userDoc.toObject(),
        userType: userType,
        activationMethod: activationMethod
      };
    });
    
    // Return response with search/filter info
    res.status(200).json({
      users: usersWithType,
      total: usersWithType.length,
      filters: {
        query: query || null,
        type: type || null,
        activationMethod: activationMethod || null
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get Soft-Deleted Users with Search and Filtering (Admin only)
exports.getSoftDeletedUsers = async (req, res) => {
  try {
    const { query, type, activationMethod } = req.query;
    
    // Build the base filter for soft-deleted users
    let filter = {
      status: "inactive",
      deletedAt: { $exists: true }
    };
    
    // Add search query filter
    if (query) {
      const searchRegex = new RegExp(query, 'i'); // Case-insensitive search
      filter.$and = [{
        $or: [
          { firstname: searchRegex },
          { lastname: searchRegex },
          { email: searchRegex }
        ]
      }];
    }
    
    // Add user type filter
    if (type) {
      if (!['standard', 'pro'].includes(type.toLowerCase())) {
        return res.status(400).json({
          message: "Invalid user type. Use 'standard' or 'pro'",
          allowedValues: ["standard", "pro"]
        });
      }
      
      if (type.toLowerCase() === 'pro') {
        filter.isPro = true;
      } else {
        filter.isPro = false;
      }
    }
    
    // Add activation method filter
    if (activationMethod) {
      if (!['code', 'card', 'none'].includes(activationMethod.toLowerCase())) {
        return res.status(400).json({
          message: "Invalid activation method. Use 'code', 'card', or 'none'",
          allowedValues: ["code", "card", "none"]
        });
      }
      
      if (activationMethod.toLowerCase() === 'none') {
        filter.$or = filter.$or || [];
        filter.$or.push({ activationMode: { $exists: false } });
        filter.$or.push({ activationMode: null });
      } else {
        filter.activationMode = activationMethod.toLowerCase();
      }
    }
    
    // Execute the query
    const softDeletedUsers = await user.find(filter).select("-password");
    
    // Add user type and activation method to each user
    const usersWithType = softDeletedUsers.map(userDoc => {
      const userType = userDoc.isPro ? "Pro" : "Standard";
      const activationMethod = userDoc.activationMode || "None";
      
      return {
        ...userDoc.toObject(),
        userType: userType,
        activationMethod: activationMethod
      };
    });
    
    // Return response with search/filter info
    res.status(200).json({
      users: usersWithType,
      total: usersWithType.length,
      filters: {
        query: query || null,
        type: type || null,
        activationMethod: activationMethod || null
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Admin Update User Status
exports.updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({
        message: "Status is required",
        allowedValues: ["active", "inactive"],
      });
    }

    // Validate status value
    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status value",
        allowedValues: ["active", "inactive"],
      });
    }

    if (!req.params.id || !req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid or missing user id" });
    }

    const gotuser = await user.findById(req.params.id);
    if (!gotuser) {
      return res.status(404).json({ message: "User not found" });
    }

    const previousStatus = gotuser.status;
    gotuser.status = status;
    await gotuser.save();

    res.status(200).json({
      message: "User status updated successfully",
      user: {
        id: gotuser._id,
        email: gotuser.email,
        firstname: gotuser.firstname,
        lastname: gotuser.lastname,
        previousStatus: previousStatus,
        currentStatus: status,
      },
      action: status === "inactive" ? "USER_DEACTIVATED" : "USER_ACTIVATED",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
// Admin Update User Status
exports.updatePlanStatus = async (req, res) => {
  try {
    const { planStatus } = req.body;
    if (!planStatus) {  
      return res.status(400).json({
        message: "Plan Status is required",
        allowedValues: ["pro", "standard"],
      });
    }

    // Validate status value
    if (!["pro", "standard"].includes(planStatus)) {
      return res.status(400).json({
        message: "Invalid plan status value",
        allowedValues: ["pro", "standard"],
      });
    }

    if (!req.params.id || !req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid or missing user id" });
    }

    const gotuser = await user.findById(req.params.id);
    if (!gotuser) {
      return res.status(404).json({ message: "User not found" });
    }

    const previousPlanStatus = gotuser.isPro;
    gotuser.isPro = planStatus === "pro" ? true : false;
    await gotuser.save();

    res.status(200).json({
      message: "User status updated successfully",
      user: {
        id: gotuser._id,
        email: gotuser.email,
        firstname: gotuser.firstname,
        lastname: gotuser.lastname,
        previousPlanStatus: previousPlanStatus,
        currentPlanStatus: planStatus,
      },
        action: planStatus === "pro" ? "USER_ACTIVATED" : "USER_DEACTIVATED",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get User by ID
exports.getUserById = async (req, res) => {
  try {
    if (!req.params.id || !req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid or missing user id" });
    }
    const gotuser = await user.findById(req.params.id).select("-password");
    if (!gotuser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Add user type and activation method
    const userType = gotuser.isPro ? "Pro" : "Standard";
    const activationMethod = gotuser.activationMode || "None";
    
    const userWithType = {
      ...gotuser.toObject(),
      userType: userType,
      activationMethod: activationMethod
    };
    
    res.status(200).json(userWithType);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update Admin Details
exports.updateAdminDetails = async (req, res) => {
  try {
    const { firstname, lastname, email, password } = req.body;
    if (!req.params.id || !req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid or missing admin id" });
    }
    const adminUser = await user.findById(req.params.id);

    if (!adminUser) {
      return res.status(404).json({ message: "Admin not found" });
    }

    adminUser.firstname = firstname || adminUser.firstname;
    adminUser.lastname = lastname || adminUser.lastname;
    adminUser.email = email || adminUser.email;
    // adminUser.status = status || adminUser.status;

    if (password) {
      const salt = await bcrypt.genSalt(10);
      adminUser.password = await bcrypt.hash(password, salt);
    }

    await adminUser.save();

    res.status(200).json({ message: "Admin details updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
// Verify OTP
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validate email and OTP input
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    // Validate OTP format (should be 4 digits)
    const otpString = otp.toString().trim();
    if (!/^\d{4}$/.test(otpString)) {
      return res.status(400).json({ message: "OTP must be a 4-digit number" });
    }

    // Find the user by email
    const gotuser = await user.findOne({ email });
    if (!gotuser) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log("Provided OTP:", otpString);
    console.log("Stored OTP:", gotuser.resetPasswordToken);
    console.log("Token Expiry Time:", gotuser.resetPasswordExpires);
    console.log("Current Time:", Date.now());

    // Check if OTP exists and hasn't expired
    if (!gotuser.resetPasswordToken || !gotuser.resetPasswordExpires) {
      return res
        .status(400)
        .json({ message: "No OTP found. Please request a new one." });
    }

    // Ensure OTP comparison works with correct data types and valid expiration
    if (
      gotuser.resetPasswordToken !== otpString ||
      new Date(gotuser.resetPasswordExpires) < Date.now()
    ) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // OTP verified successfully - generate a secure reset token
    const resetToken = jwt.sign(
      {
        email: gotuser.email,
        userId: gotuser._id,
        purpose: "password_reset",
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" } // 15 minutes expiration
    );

    // Clear the OTP since it's been successfully verified
    gotuser.resetPasswordToken = undefined;
    gotuser.resetPasswordExpires = undefined;

    // Store the reset token temporarily for additional security validation
    gotuser.activeResetToken = resetToken;
    gotuser.resetTokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await gotuser.save();

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully. You can now reset your password.",
      resetToken: resetToken,
    });
  } catch (err) {
    console.error("Error in OTP Verification:", err);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
};

// Email Verification OTP
exports.verifyEmailOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validate email and OTP input
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    // Validate OTP format (should be 4 digits)
    const otpString = otp.toString().trim();
    if (!/^\d{4}$/.test(otpString)) {
      return res.status(400).json({ message: "OTP must be a 4-digit number" });
    }

    // Find the user by email
    const gotuser = await user.findOne({ email });
    if (!gotuser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user is already verified
    if (gotuser.isEmailVerified) {
      return res.status(400).json({ message: "Email is already verified" });
    }

    // Check if OTP exists and hasn't expired
    if (!gotuser.emailVerificationOTP || !gotuser.emailVerificationExpires) {
      return res.status(400).json({
        message: "No verification OTP found. Please request a new one.",
      });
    }

    // Verify OTP and check expiration
    if (
      gotuser.emailVerificationOTP !== otpString ||
      new Date(gotuser.emailVerificationExpires) < Date.now()
    ) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Mark email as verified and clear OTP
    gotuser.isEmailVerified = true;
    gotuser.emailVerificationOTP = undefined;
    gotuser.emailVerificationExpires = undefined;
    await gotuser.save();

    // Send welcome email after successful verification
    emailService.sendWelcomeEmail(email, gotuser.firstname).catch((error) => {
      console.error("Failed to send welcome email:", error);
    });

    // Generate JWT token for automatic login
    const token = jwt.sign({ _id: gotuser._id }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    return res.status(200).json({
      message: "Email verified successfully! Welcome to Comeaway!",
      token,
      user: {
        _id: gotuser._id,
        firstname: gotuser.firstname,
        lastname: gotuser.lastname,
        email: gotuser.email,
        phoneNumber: gotuser.phoneNumber || "",
        role: gotuser.role,
        isEmailVerified: gotuser.isEmailVerified,
        isPro: gotuser.isPro,
        proExpiresAt: gotuser.proExpiresAt,
      },
    });
  } catch (error) {
    console.error("Error in email verification:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Resend Email Verification OTP
exports.resendEmailVerificationOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Find the user by email
    const gotuser = await user.findOne({ email });
    if (!gotuser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user is already verified
    if (gotuser.isEmailVerified) {
      return res.status(400).json({ message: "Email is already verified" });
    }

    // Generate new OTP
    const generateRandomOTP = () => {
      return Math.floor(1000 + Math.random() * 9000);
    };

    const otp = generateRandomOTP();
    gotuser.emailVerificationOTP = otp.toString();
    gotuser.emailVerificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await gotuser.save();

    // Send verification OTP email
    try {
      await emailService.sendVerificationOTP(email, gotuser.firstname, otp);
      res.status(200).json({
        message:
          "Verification OTP resent successfully. Please check your email.",
        email: email,
      });
    } catch (emailError) {
      console.error("Failed to resend verification email:", emailError);
      res.status(500).json({
        message: "Failed to send verification email. Please try again later.",
      });
    }
  } catch (error) {
    console.error("Error in resending verification OTP:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Helper function to validate profile data
const validateProfileData = (firstname, lastname, phoneNumber) => {
  const errors = [];

  // Validate firstname
  if (!firstname || typeof firstname !== "string") {
    errors.push("First name is required");
  } else if (firstname.length < 2 || firstname.length > 50) {
    errors.push("First name must be between 2 and 50 characters");
  } else if (!/^[a-zA-Z\s\-']+$/.test(firstname.trim())) {
    errors.push(
      "First name can only contain letters, spaces, hyphens, and apostrophes"
    );
  }

  // Validate lastname
  if (!lastname || typeof lastname !== "string") {
    errors.push("Last name is required");
  } else if (lastname.length < 2 || lastname.length > 50) {
    errors.push("Last name must be between 2 and 50 characters");
  } else if (!/^[a-zA-Z\s\-']+$/.test(lastname.trim())) {
    errors.push(
      "Last name can only contain letters, spaces, hyphens, and apostrophes"
    );
  }

  // Validate phoneNumber (optional)
  if (phoneNumber) {
    // Basic phone number validation - allows various international formats
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(phoneNumber.replace(/[\s\-\(\)]/g, ""))) {
      errors.push("Please enter a valid phone number");
    }
  }

  return errors;
};

// Helper function to sanitize input data
const sanitizeInput = (str) => {
  if (!str) return "";
  return str.trim().replace(/[<>]/g, ""); // Basic XSS prevention
};

// Helper function to check rate limiting
const checkProfileUpdateRateLimit = (user) => {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // Reset count if it's been more than an hour since last update
  if (!user.profileLastUpdated || user.profileLastUpdated < oneHourAgo) {
    return { allowed: true, resetCount: true };
  }

  // Check if user has exceeded the limit
  if (user.profileUpdateCount >= 10) {
    return {
      allowed: false,
      resetCount: false,
      timeUntilReset: Math.ceil(
        (user.profileLastUpdated.getTime() + 60 * 60 * 1000 - now.getTime()) /
          60000
      ),
    };
  }

  return { allowed: true, resetCount: false };
};

// Get Current User Profile
exports.getCurrentUserProfile = async (req, res) => {
  try {
    // Get user ID from JWT token (set by auth middleware)
    const userId = req.user._id;

    // Find user and exclude sensitive fields
    const gotuser = await user
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

    // Check and update Pro status
    const updatedUser = await checkAndUpdateProStatus(gotuser);
    
    // Determine user type and activation method
    const userType = updatedUser.isPro ? "Pro" : "Standard";
    const activationMethod = updatedUser.activationMode || "None";

    res.status(200).json({
      success: true,
      message: "Profile retrieved successfully",
      user: {
        _id: updatedUser._id,
        firstname: updatedUser.firstname,
        lastname: updatedUser.lastname,
        email: updatedUser.email,
        phoneNumber: updatedUser.phoneNumber || "",
        role: updatedUser.role,
        status: updatedUser.status,
        isEmailVerified: updatedUser.isEmailVerified,
        isPro: updatedUser.isPro,
        proExpiresAt: updatedUser.proExpiresAt,
        userType: userType,
        activationMethod: activationMethod,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
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
        role: gotuser.role,
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

// Request deletion of user account
exports.requestDeletion = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Find the user by email
    const findUser = await user.findOne({ email });
    if (!findUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user is already soft deleted
    if (findUser.status === "inactive" && findUser.deletedAt) {
      return res.status(404).json({ 
        message: "User not found"
      });
    }

    // Generate new OTP
    const generateRandomOTP = () => {
      return Math.floor(1000 + Math.random() * 9000);
    };

    const otp = generateRandomOTP();
    findUser.requestDeletionOTP = otp.toString();
    findUser.requestDeletionExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await findUser.save();

    // Send account deletion request OTP email
    try {
      await emailService.sendDeletionRequestOTP(email, findUser.firstname, otp);
      res.status(200).json({
        message:
          "Account deletion verification OTP sent successfully. Please check your email.",
        email: email,
      });
    } catch (emailError) {
      console.error("Failed to send deletion request email:", emailError);
      res.status(500).json({
        message: "Failed to send deletion verification email. Please try again later.",
      });
    }
  } catch (error) {
    console.error("Error in resending verification OTP:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Confirm account deletion with OTP and delete user account
exports.confirmAccountDeletion = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ 
        message: "Email and OTP are required" 
      });
    }

    // Find the user by email
    const findUser = await user.findOne({ email });
    if (!findUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if deletion OTP exists and is valid
    if (!findUser.requestDeletionOTP || !findUser.requestDeletionExpires) {
      return res.status(400).json({ 
        message: "No deletion request found. Please request deletion first." 
      });
    }

    // Check if OTP has expired
    if (new Date() > findUser.requestDeletionExpires) {
      return res.status(400).json({ 
        message: "Deletion OTP has expired. Please request a new deletion code." 
      });
    }

    // Verify OTP
    if (findUser.requestDeletionOTP !== otp) {
      return res.status(400).json({ 
        message: "Invalid OTP. Please check your email and try again." 
      });
    }

    // Clear the OTP fields
    findUser.requestDeletionOTP = undefined;
    findUser.requestDeletionExpires = undefined;

    // Soft delete - mark as inactive and add deletion timestamp
    findUser.status = "inactive";
    findUser.deletedAt = new Date();
    findUser.deletionReason = "User requested account deletion";
    await findUser.save();

    // Send confirmation email to admin (optional)
    try {
      await emailService.sendAdminNotification(
        "Account Deletion Confirmed",
        `User account ${email} has been soft deleted (marked as inactive).`,
        {
          deletedUser: {
            email: findUser.email,
            firstName: findUser.firstname,
            lastName: findUser.lastname,
            deletedAt: new Date().toISOString(),
            deletionReason: "User requested account deletion"
          }
        }
      );
    } catch (emailError) {
      console.error("Failed to send admin notification:", emailError);
      // Don't fail the deletion if admin notification fails
    }

    res.status(200).json({ 
      message: "Account deleted successfully. All your data has been permanently removed." 
    });

  } catch (error) {
    console.error("Error in confirming account deletion:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Delete User by ID (Admin only) - Soft Delete
exports.deleteUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    const { reason } = req.body; // Optional reason for deletion

    if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid or missing user id" });
    }
    
    const foundUser = await user.findById(userId);
    if (!foundUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user is already soft deleted
    if (foundUser.status === "inactive" && foundUser.deletedAt) {
      return res.status(400).json({ 
        message: "User is already soft deleted",
        deletedAt: foundUser.deletedAt,
        deletionReason: foundUser.deletionReason
      });
    }

    // Soft delete - mark as inactive and add deletion timestamp
    foundUser.status = "inactive";
    foundUser.deletedAt = new Date();
    foundUser.deletionReason = reason || "Admin requested account deletion";
    await foundUser.save();

    res.status(200).json({ 
      message: "User soft deleted successfully",
      user: {
        id: foundUser._id,
        email: foundUser.email,
        firstname: foundUser.firstname,
        lastname: foundUser.lastname,
        status: foundUser.status,
        deletedAt: foundUser.deletedAt,
        deletionReason: foundUser.deletionReason
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Admin: Deactivate User (Convenience endpoint)
exports.deactivateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { reason } = req.body; // Optional reason for deactivation

    if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid or missing user id" });
    }

    const foundUser = await user.findById(userId);
    if (!foundUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (foundUser.status === "inactive") {
      return res.status(400).json({
        message: "User is already deactivated",
        user: {
          id: foundUser._id,
          email: foundUser.email,
          status: foundUser.status,
        },
      });
    }

    foundUser.status = "inactive";
    await foundUser.save();

    res.status(200).json({
      message: "User deactivated successfully",
      user: {
        id: foundUser._id,
        email: foundUser.email,
        firstname: foundUser.firstname,
        lastname: foundUser.lastname,
        status: foundUser.status,
      },
      action: "USER_DEACTIVATED",
      reason: reason || "No reason provided",
      deactivatedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Admin: Activate User (Convenience endpoint)
exports.activateUser = async (req, res) => {
  try {
    const userId = req.params.id;

    if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid or missing user id" });
    }

    const foundUser = await user.findById(userId);
    if (!foundUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (foundUser.status === "active") {
      return res.status(400).json({
        message: "User is already active",
        user: {
          id: foundUser._id,
          email: foundUser.email,
          status: foundUser.status,
        },
      });
    }

    foundUser.status = "active";
    await foundUser.save();

    res.status(200).json({
      message: "User activated successfully",
      user: {
        id: foundUser._id,
        email: foundUser.email,
        firstname: foundUser.firstname,
        lastname: foundUser.lastname,
        status: foundUser.status,
      },
      action: "USER_ACTIVATED",
      activatedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Admin: Restore Soft-Deleted User
exports.restoreUser = async (req, res) => {
  try {
    const userId = req.params.id;

    if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid or missing user id" });
    }

    const foundUser = await user.findById(userId);
    if (!foundUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user is soft deleted
    if (!foundUser.deletedAt) {
      return res.status(400).json({
        message: "User is not soft deleted",
        user: {
          id: foundUser._id,
          email: foundUser.email,
          status: foundUser.status,
        },
      });
    }

    // Restore user by clearing soft delete fields
    foundUser.status = "active";
    foundUser.deletedAt = undefined;
    foundUser.deletionReason = undefined;
    await foundUser.save();

    res.status(200).json({
      message: "User restored successfully",
      user: {
        id: foundUser._id,
        email: foundUser.email,
        firstname: foundUser.firstname,
        lastname: foundUser.lastname,
        status: foundUser.status,
      },
      action: "USER_RESTORED",
      restoredAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
