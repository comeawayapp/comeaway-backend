const jwt = require("jsonwebtoken");
const user = require("../../models/user");
const emailService = require("../../services/emailService");
const {
  checkAndRedeemEntitlement,
  normalizeEmail,
  findUserByEmailCI,
} = require("./entitlementHelper");

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

    const normalizedEmail = normalizeEmail(email);

    // Find the user by email (case-insensitive)
    let gotuser = await findUserByEmailCI(normalizedEmail);
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

    // Check for entitlement and auto-redeem if user is Standard
    if (!gotuser.isPro) {
      await checkAndRedeemEntitlement(gotuser.email, gotuser._id);
      // Refresh user data after potential entitlement redemption
      gotuser = await user.findById(gotuser._id);
    }

    // Send welcome email after successful verification
    emailService.sendWelcomeEmail(normalizedEmail, gotuser.firstname).catch((error) => {
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

    const normalizedEmail = normalizeEmail(email);

    // Find the user by email (case-insensitive)
    const gotuser = await findUserByEmailCI(normalizedEmail);
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
      await emailService.sendVerificationOTP(normalizedEmail, gotuser.firstname, otp);
      res.status(200).json({
        message:
          "Verification OTP resent successfully. Please check your email.",
        email: normalizedEmail,
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

