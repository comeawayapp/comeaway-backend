const express = require("express");
const router = express.Router();
const stripeWebhookController = require("../controllers/stripeWebhookController");

// Webhook endpoint that needs raw body for signature verification
router.post("/", express.raw({ type: 'application/json' }), stripeWebhookController.handleWebhook);

module.exports = router;