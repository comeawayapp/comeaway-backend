const express = require("express");
const router = express.Router();
const activationCodeController = require("../controllers/activationCodeController");
const auth = require("../middleware/auth");

// Admin routes
router.post(
  "/admin/activation-codes",
  auth,
  activationCodeController.createActivationCode
);
router.get(
  "/admin/activation-codes",
  auth,
  activationCodeController.listActivationCodes
);

// User route
router.post(
  "/activation-codes/redeem",
  auth,
  activationCodeController.redeemActivationCode
);

module.exports = router;
