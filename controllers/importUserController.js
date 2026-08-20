const bcrypt = require("bcryptjs");
const user = require("../models/user");
const emailService = require("../services/emailService");
const {
  isSoftDeleted,
  freeSoftDeletedUserEmail,
} = require("./user/helpers");

// Signup
exports.signup = async (req, res) => {
  try {
    const { firstname, lastname, email, password } = req.body;
    if (!firstname || !lastname || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if user already exists
    let existingUser = await user.findOne({ email });

    // Soft-deleted: free email and create a new account
    if (existingUser && isSoftDeleted(existingUser)) {
      await freeSoftDeletedUserEmail(existingUser);
      existingUser = null;
    }

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
