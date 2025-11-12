// Re-export all user controller methods from modular files
// This maintains backward compatibility with existing routes

const authController = require("./user/authController");
const passwordController = require("./user/passwordController");
const emailVerificationController = require("./user/emailVerificationController");
const profileController = require("./user/profileController");
const adminController = require("./user/adminController");
const deletionController = require("./user/deletionController");

// Authentication methods
exports.login = authController.login;
exports.signup = authController.signup;
exports.googleSignIn = authController.googleSignIn;
exports.facebookSignIn = authController.facebookSignIn;
exports.appleSignIn = authController.appleSignIn;

// Password management methods
exports.forgotPassword = passwordController.forgotPassword;
exports.resetPassword = passwordController.resetPassword;
exports.verifyOtp = passwordController.verifyOtp;

// Email verification methods
exports.verifyEmailOTP = emailVerificationController.verifyEmailOTP;
exports.resendEmailVerificationOTP = emailVerificationController.resendEmailVerificationOTP;

// Profile management methods
exports.getCurrentUserProfile = profileController.getCurrentUserProfile;
exports.updateUserProfile = profileController.updateUserProfile;

// Admin user management methods
exports.getAllUsers = adminController.getAllUsers;
exports.getSoftDeletedUsers = adminController.getSoftDeletedUsers;
exports.getUserById = adminController.getUserById;
exports.updateUserStatus = adminController.updateUserStatus;
exports.updatePlanStatus = adminController.updatePlanStatus;
exports.updateAdminDetails = adminController.updateAdminDetails;
exports.deleteUserById = adminController.deleteUserById;
exports.deactivateUser = adminController.deactivateUser;
exports.activateUser = adminController.activateUser;
exports.restoreUser = adminController.restoreUser;

// Account deletion methods
exports.requestDeletion = deletionController.requestDeletion;
exports.confirmAccountDeletion = deletionController.confirmAccountDeletion;
