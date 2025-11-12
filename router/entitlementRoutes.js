const express = require("express");
const router = express.Router();
const entitlementController = require("../controllers/entitlementController");
const auth = require("../middleware/auth");

// Admin routes
router.post(
  "/admin/entitlements",
  auth,
  entitlementController.createEntitlement
);
router.post(
  "/admin/entitlements/send-to-user",
  auth,
  entitlementController.sendAccessEmailToUser
);
router.get(
  "/admin/entitlements",
  auth,
  entitlementController.listEntitlements
);
router.put(
  "/admin/entitlements/:id",
  auth,
  entitlementController.editEntitlement
);
router.delete(
  "/admin/entitlements/:id",
  auth,
  entitlementController.deleteEntitlement
);
router.post(
  "/admin/entitlements/import",
  auth,
  entitlementController.importEntitlements
);

// User route
router.post(
  "/entitlements/redeem",
  auth,
  entitlementController.redeemEntitlement
);

module.exports = router;

