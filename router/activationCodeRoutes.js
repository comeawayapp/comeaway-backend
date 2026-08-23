const express = require("express");
const router = express.Router();
const activationCodeController = require("../controllers/activationCodeController");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

const staffDashboard = requireRole("owner", "admin");

router.post(
  "/admin/activation-codes",
  auth,
  staffDashboard,
  activationCodeController.createActivationCode
);
router.post(
  "/admin/activation-codes/generate-bulk",
  auth,
  staffDashboard,
  activationCodeController.generateBulkCodes
);
router.post(
  "/admin/activation-codes/send-to-user",
  auth,
  staffDashboard,
  activationCodeController.sendAccessCodeToUser
);
router.get(
  "/admin/activation-codes",
  auth,
  staffDashboard,
  activationCodeController.listActivationCodes
);
router.put(
  "/admin/activation-codes/:id",
  auth,
  staffDashboard,
  activationCodeController.editActivationCode
);
router.delete(
  "/admin/activation-codes/:id",
  auth,
  staffDashboard,
  activationCodeController.deleteActivationCode
);
router.post(
  "/admin/activation-codes/import",
  auth,
  staffDashboard,
  activationCodeController.importActivationCodes
);

router.post(
  "/activation-codes/redeem",
  auth,
  activationCodeController.redeemActivationCode
);

module.exports = router;
