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
router.delete(
  "/admin/activation-codes/:id",
  auth,
  activationCodeController.deleteActivationCode
);
router.post(
  "/admin/activation-codes/import",
  auth,
  activationCodeController.importActivationCodes
);

// User route
router.post(
  "/activation-codes/redeem",
  auth,
  activationCodeController.redeemActivationCode
);

module.exports = router;
