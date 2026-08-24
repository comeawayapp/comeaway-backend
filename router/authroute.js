const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/auth");
const checkProStatus = require("../middleware/checkProStatus");
const requireRole = require("../middleware/requireRole");

const staffDashboard = requireRole("owner", "admin");

// Login route
router.post("/login", userController.login);
router.post("/signup", userController.signup);
router.post("/forgetPassword", userController.forgotPassword);
router.post("/resetPassword", userController.resetPassword);
router.get("/all-user", authMiddleware, staffDashboard, userController.getAllUsers);
router.get(
  "/soft-deleted-users",
  authMiddleware,
  staffDashboard,
  userController.getSoftDeletedUsers
);
router.post("/verifyOtp", userController.verifyOtp);
router.post("/verifyEmailOTP", userController.verifyEmailOTP);
router.post(
  "/resendEmailVerificationOTP",
  userController.resendEmailVerificationOTP
);
router.put(
  "/updateStatus/:id",
  authMiddleware,
  staffDashboard,
  checkProStatus,
  userController.updateUserStatus
);
// Mobile + app: any authenticated user (not staff-only)
router.get(
  "/getSingleUser/:id",
  authMiddleware,
  checkProStatus,
  userController.getUserById
);
router.put(
  "/admin/update/:id",
  authMiddleware,
  staffDashboard,
  checkProStatus,
  userController.updateAdminDetails
);
router.post("/google-signin", userController.googleSignIn);
router.post("/facebook-signin", userController.facebookSignIn);
router.post("/apple-signin", userController.appleSignIn);

router.get(
  "/user/profile",
  authMiddleware,
  userController.getCurrentUserProfile
);
router.get("/users/me", authMiddleware, userController.getCurrentUserProfile);
router.patch("/user/profile", authMiddleware, userController.updateUserProfile);
router.put("/users/me", authMiddleware, userController.updateUserProfile);

router.delete(
  "/admin/delete/:id",
  authMiddleware,
  staffDashboard,
  userController.deleteUserById
);

router.put(
  "/admin/deactivate/:id",
  authMiddleware,
  staffDashboard,
  userController.deactivateUser
);
router.put(
  "/admin/activate/:id",
  authMiddleware,
  staffDashboard,
  userController.activateUser
);

router.put(
  "/admin/restore/:id",
  authMiddleware,
  staffDashboard,
  userController.restoreUser
);

router.put(
  "/admin/update-plan-status/:id",
  authMiddleware,
  staffDashboard,
  userController.updatePlanStatus
);

router.post("/request-deletion", userController.requestDeletion);
router.post("/confirm-deletion", userController.confirmAccountDeletion);

module.exports = router;
