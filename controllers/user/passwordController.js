const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const user = require("../../models/user");
const emailService = require("../../services/emailService");

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

