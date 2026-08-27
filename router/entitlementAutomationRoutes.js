const express = require("express");
const router = express.Router();
const automationController = require("../controllers/entitlementAutomationController");
const requireApiKey = require("../middleware/requireApiKey");

router.post("/sync", requireApiKey, automationController.syncEntitlements);
router.post("/expire", requireApiKey, automationController.expireEntitlements);
router.post("/match", requireApiKey, automationController.matchEntitlements);

module.exports = router;
