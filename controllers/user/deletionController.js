const user = require("../../models/user");
const emailService = require("../../services/emailService");

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
    // findUser.status = "inactive";
    // findUser.deletedAt = new Date();
    // findUser.deletionReason = "User requested account deletion";
    // await findUser.save();

    // Delete user account
    await findUser.deleteOne();

    // Send confirmation email to admin (optional)
    try {
      await emailService.sendAdminNotification(
        "Account Deletion Confirmed",
        `User account ${email} has been deleted.`,
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

