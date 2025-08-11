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
router.post(
  "/admin/activation-codes/generate-bulk",
  auth,
  activationCodeController.generateBulkCodes
);
router.post(
  "/admin/activation-codes/send-to-user",
  auth,
  activationCodeController.sendAccessCodeToUser
);
router.get(
  "/admin/activation-codes",
  auth,
  activationCodeController.listActivationCodes
);
router.put(
  "/admin/activation-codes/:id",
  auth,
  activationCodeController.editActivationCode
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
