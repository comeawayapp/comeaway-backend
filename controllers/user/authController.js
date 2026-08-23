const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const user = require("../../models/user");
const emailService = require("../../services/emailService");
const {
  checkAndUpdateProStatus,
  verifyAppleToken,
  isSoftDeleted,
  freeSoftDeletedUserEmail,
} = require("./helpers");
const {
  checkAndRedeemEntitlement,
  normalizeEmail,
  findUserByEmailCI,
} = require("./entitlementHelper");

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const normalizedEmail = normalizeEmail(email);

    // Case-insensitive email lookup
    let gotuser = await findUserByEmailCI(normalizedEmail);
    if (!gotuser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user is soft deleted
    if (gotuser.status === "inactive" && gotuser.deletedAt) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Normalize stored email if mixed case
    if (gotuser.email !== normalizedEmail) {
      gotuser.email = normalizedEmail;
      await gotuser.save();
    }

    // Check if the password is correct
    const isMatch = await bcrypt.compare(String(password), gotuser.password);
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

    // Check for entitlement and auto-redeem if user is Standard
    if (!gotuser.isPro) {
      await checkAndRedeemEntitlement(gotuser.email, gotuser._id);
      // Refresh user data after potential entitlement redemption
      gotuser = await user.findById(gotuser._id);
    }

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
        role: gotuser.role || null,
        accountType:
          gotuser.accountType || (gotuser.isPro ? "pro" : "standard"),
        isEmailVerified: gotuser.isEmailVerified,
        isPro: gotuser.isPro,
        proExpiresAt: gotuser.proExpiresAt,
        userType: userType,
        activationMethod: activationMethod,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.googleSignIn = async (req, res) => {
  try {
    const { idToken, user: googleUser } = req.body; // Extract data from the request body

    // Extract user information from the Google response
    const { email, givenName, familyName, photo } = googleUser;
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Check if a user with this email already exists in the database
    let existingUser = await findUserByEmailCI(normalizedEmail);

    // Soft-deleted: free email and create a new account
    if (existingUser && isSoftDeleted(existingUser)) {
      await freeSoftDeletedUserEmail(existingUser);
      existingUser = null;
    }

    if (!existingUser) {
      // Create a new user if one does not exist
      const newUser = new user({
        firstname: givenName,
        lastname: familyName,
        email: normalizedEmail,
        password: "12345678", // Leave password empty for Google sign-ins
        role: null,
        accountType: "standard",
        status: "active",
        photo,
      });

      existingUser = await newUser.save();
    } else if (existingUser.email !== normalizedEmail) {
      existingUser.email = normalizedEmail;
      await existingUser.save();
    }

    // Downgrade if proExpiresAt has passed
    existingUser = await checkAndUpdateProStatus(existingUser);

    // Auto-redeem entitlement if still Standard
    if (!existingUser.isPro) {
      await checkAndRedeemEntitlement(existingUser.email, existingUser._id);
      existingUser = await user.findById(existingUser._id);
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
        photo: existingUser.photo,
        role: existingUser.role || null,
        accountType: existingUser.accountType || (existingUser.isPro ? "pro" : "standard"),
        isPro: existingUser.isPro,
        proExpiresAt: existingUser.proExpiresAt,
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
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Check if a user with this email already exists in the database
    let existingUser = await findUserByEmailCI(normalizedEmail);

    // Soft-deleted: free email and create a new account
    if (existingUser && isSoftDeleted(existingUser)) {
      await freeSoftDeletedUserEmail(existingUser);
      existingUser = null;
    }

    if (!existingUser) {
      // Create a new user if one does not exist
      const newUser = new user({
        firstname: firstName,
        lastname: lastName,
        email: normalizedEmail,
        password: "12345678",
        role: null,
        accountType: "standard",
        status: "active",
        photo,
      });

      existingUser = await newUser.save();
    } else if (existingUser.email !== normalizedEmail) {
      existingUser.email = normalizedEmail;
      await existingUser.save();
    }

    // Downgrade if proExpiresAt has passed
    existingUser = await checkAndUpdateProStatus(existingUser);

    // Auto-redeem entitlement if still Standard
    if (!existingUser.isPro) {
      await checkAndRedeemEntitlement(existingUser.email, existingUser._id);
      existingUser = await user.findById(existingUser._id);
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
        photo: existingUser.photo,
        role: existingUser.role || null,
        accountType: existingUser.accountType || (existingUser.isPro ? "pro" : "standard"),
        isPro: existingUser.isPro,
        proExpiresAt: existingUser.proExpiresAt,
      },
    });
    // Call the migration function
    // await migrateSocialAuthUserToUserCollection();
  } catch (error) {
    console.error("Error in Facebook Sign-In:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Apple Sign In
exports.appleSignIn = async (req, res) => {
  try {
    const { identityToken, user: appleUser } = req.body;
    
    if (!identityToken) {
      return res.status(400).json({ message: "Identity token is required" });
    }

    // Verify Apple identity token
    const appleUserData = await verifyAppleToken(identityToken);
    
    if (!appleUserData) {
      return res.status(400).json({ message: "Invalid Apple identity token" });
    }

    const { email, sub: appleId, email_verified } = appleUserData;
    const normalizedEmail = normalizeEmail(email);

    // Check if a user with this email or appleId already exists
    let existingUser = null;
    if (normalizedEmail) {
      existingUser = await findUserByEmailCI(normalizedEmail);
    }
    if (!existingUser && appleId) {
      existingUser = await user.findOne({ appleId, authProvider: "apple" });
    }

    // Soft-deleted: free email/appleId and create a new account
    if (existingUser && isSoftDeleted(existingUser)) {
      await freeSoftDeletedUserEmail(existingUser);
      existingUser = null;
    }

    if (!existingUser) {
      if (!normalizedEmail) {
        return res.status(400).json({ message: "Email is required from Apple Sign-In" });
      }
      // Create a new user if one does not exist
      const newUser = new user({
        firstname: appleUser?.name?.firstName || "Apple",
        lastname: appleUser?.name?.lastName || "User",
        email: normalizedEmail,
        password: appleId,
        role: null,
        accountType: "standard",
        status: "active",
        isEmailVerified: email_verified || true,
        appleId: appleId,
        authProvider: "apple",
      });

      existingUser = await newUser.save();

      // Check for entitlement and auto-redeem if user is Standard
      if (!existingUser.isPro) {
        await checkAndRedeemEntitlement(existingUser.email, existingUser._id);
        // Refresh user data after potential entitlement redemption
        existingUser = await user.findById(existingUser._id);
      }
    } else {
      // Update Apple ID if not already set
      if (!existingUser.appleId) {
        existingUser.appleId = appleId;
        existingUser.authProvider = "apple";
      }
      if (normalizedEmail && existingUser.email !== normalizedEmail) {
        existingUser.email = normalizedEmail;
      }
      await existingUser.save();

      // Check for entitlement and auto-redeem if user is Standard
      if (!existingUser.isPro) {
        await checkAndRedeemEntitlement(existingUser.email, existingUser._id);
        // Refresh user data after potential entitlement redemption
        existingUser = await user.findById(existingUser._id);
      }
    }

    // Check and update Pro status
    existingUser = await checkAndUpdateProStatus(existingUser);

    // Generate a JWT token for the user
    const token = jwt.sign({ _id: existingUser._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    // Determine user type and activation method
    const userType = existingUser.isPro ? "Pro" : "Standard";
    const activationMethod = existingUser.activationMode || "None";

    // Respond with the user data and token
    res.status(200).json({
      message: "Apple Sign-In successful",
      token,
      user: {
        _id: existingUser._id,
        firstname: existingUser.firstname,
        lastname: existingUser.lastname,
        email: existingUser.email,
        phoneNumber: existingUser.phoneNumber || "",
        role: existingUser.role || null,
        accountType:
          existingUser.accountType ||
          (existingUser.isPro ? "pro" : "standard"),
        isEmailVerified: existingUser.isEmailVerified,
        isPro: existingUser.isPro,
        proExpiresAt: existingUser.proExpiresAt,
        userType: userType,
        activationMethod: activationMethod,
        authProvider: existingUser.authProvider
      },
    });

  } catch (error) {
    console.error("Error in Apple Sign-In:", error);
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

    const normalizedEmail = normalizeEmail(email);

    // Check if user already exists (case-insensitive)
    let existingUser = await findUserByEmailCI(normalizedEmail);

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
      existingUser.email = normalizedEmail;
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
        email: normalizedEmail,
        password: hashedPassword,
        role: null,
        accountType: "standard",
        emailVerificationOTP: otp.toString(),
        emailVerificationExpires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        isEmailVerified: false,
      });
      await newUser.save();
    }

    // Send verification OTP email
    try {
      await emailService.sendVerificationOTP(normalizedEmail, firstname, otp);
      res.status(200).json({
        message:
          "Verification OTP sent to your email. Please verify to complete registration.",
        email: normalizedEmail,
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

