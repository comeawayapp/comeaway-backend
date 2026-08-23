const express = require("express");
const router = express.Router();
const entitlementController = require("../controllers/entitlementController");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

const staffDashboard = requireRole("owner", "admin");

router.post(
  "/admin/entitlements",
  auth,
  staffDashboard,
  entitlementController.createEntitlement
);
router.post(
  "/admin/entitlements/send-to-user",
  auth,
  staffDashboard,
  entitlementController.sendAccessEmailToUser
);
router.get(
  "/admin/entitlements",
  auth,
  staffDashboard,
  entitlementController.listEntitlements
);
router.put(
  "/admin/entitlements/:id",
  auth,
  staffDashboard,
  entitlementController.editEntitlement
);
router.delete(
  "/admin/entitlements/:id",
  auth,
  staffDashboard,
  entitlementController.deleteEntitlement
);
router.post(
  "/admin/entitlements/import",
  auth,
  staffDashboard,
  entitlementController.importEntitlements
);

router.post(
  "/entitlements/redeem",
  auth,
  entitlementController.redeemEntitlement
);

module.exports = router;
