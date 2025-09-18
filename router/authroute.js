const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/auth");
const checkProStatus = require("../middleware/checkProStatus");

// Login route
router.post("/login", userController.login);
router.post("/signup", userController.signup);
router.post("/forgetPassword", userController.forgotPassword);
router.post("/resetPassword", userController.resetPassword);
router.get("/all-user", authMiddleware, userController.getAllUsers);
router.get("/soft-deleted-users", authMiddleware, userController.getSoftDeletedUsers);
router.post("/verifyOtp", userController.verifyOtp); // Password reset OTP verification
router.post("/verifyEmailOTP", userController.verifyEmailOTP); // Email verification OTP
router.post(
  "/resendEmailVerificationOTP",
  userController.resendEmailVerificationOTP
); // Resend email verification OTP
router.put(
  "/updateStatus/:id",
  authMiddleware,
  checkProStatus,
  userController.updateUserStatus
);
router.get(
  "/getSingleUser/:id",
  authMiddleware,
  checkProStatus,
  userController.getUserById
);
router.put(
  "/admin/update/:id",
  authMiddleware,
  checkProStatus,
  userController.updateAdminDetails
);
router.post("/google-signin", userController.googleSignIn);
router.post("/facebook-signin", userController.facebookSignIn);
router.post("/apple-signin", userController.appleSignIn);

// Profile management routes
router.get(
  "/user/profile",
  authMiddleware,
  userController.getCurrentUserProfile
);
router.get("/users/me", authMiddleware, userController.getCurrentUserProfile); // Alternative endpoint
router.patch("/user/profile", authMiddleware, userController.updateUserProfile);
router.put("/users/me", authMiddleware, userController.updateUserProfile); // Alternative endpoint

// Delete user by ID (admin only)
router.delete(
  "/admin/delete/:id",
  authMiddleware,
  userController.deleteUserById
);

// Admin: Deactivate/Activate user endpoints
router.put(
  "/admin/deactivate/:id",
  authMiddleware,
  userController.deactivateUser
);
router.put("/admin/activate/:id", authMiddleware, userController.activateUser);

// Admin: Restore soft-deleted user
router.put("/admin/restore/:id", authMiddleware, userController.restoreUser);

// Admin: Update user plan status (pro/standard)
router.put(
  "/admin/update-plan-status/:id",
  authMiddleware,
  userController.updatePlanStatus
);

// Account deletion request
router.post("/request-deletion", userController.requestDeletion);

// Confirm account deletion with OTP
router.post("/confirm-deletion", userController.confirmAccountDeletion);

module.exports = router;
