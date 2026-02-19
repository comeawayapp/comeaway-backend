

const express = require("express");
const router = express.Router();

const revenueCatWebhook = require("../controllers/revenuecatWebhookController");

router.post("/", revenueCatWebhook);

module.exports = router;