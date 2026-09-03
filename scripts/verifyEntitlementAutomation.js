/**
 * Lightweight verification for entitlement automation behavior.
 * Run with MongoDB available:
 *   MONGODB_URI=... ENTITLEMENT_AUTOMATION_API_KEY=test node scripts/verifyEntitlementAutomation.js
 *
 * Uses in-process controller calls (no HTTP server required).
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Entitlement = require("../models/Entitlement");
const {
  syncEntitlements,
  matchEntitlements,
  expireEntitlements,
} = require("../controllers/entitlementAutomationController");

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

async function call(handler, body) {
  const req = { body };
  const res = mockRes();
  await handler(req, res);
  return res;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function cleanup(orderNumbers) {
  await Entitlement.deleteMany({ orderNumber: { $in: orderNumbers } });
}

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI required");
    process.exit(1);
  }

  await mongoose.connect(uri);
  const orders = [
    "VERIFY-SYNC-001",
    "702-6674459-9272258",
    "113-8993219-9272258",
    "VERIFY-EXPIRE-001",
  ];
  await cleanup(orders);

  try {
    // 1) Amazon sync without email
    let res = await call(syncEntitlements, {
      order_number: "702-6674459-9272258",
      platform: "amazon",
      quantity: 3,
      product_name: "Comeaway Sleep Mask",
      customer_name: "Sarah",
    });
    assert(res.statusCode === 201, `Amazon sync expected 201, got ${res.statusCode}`);
    assert(res.body.created === 3, "Amazon sync should create 3");
    assert(
      res.body.entitlements.every((e) => e.customerEmail == null && e.assignedTo == null),
      "Amazon emails should be null"
    );

    // 2) Idempotent retry
    res = await call(syncEntitlements, {
      order_number: "702-6674459-9272258",
      platform: "amazon",
      quantity: 3,
      product_name: "Comeaway Sleep Mask",
    });
    assert(res.statusCode === 200, `Retry expected 200, got ${res.statusCode}`);
    assert(res.body.created === 0, "Retry should create 0");
    assert(res.body.total === 3, "Retry total should stay 3");

    // 3) Shopify requires email
    res = await call(syncEntitlements, {
      order_number: "VERIFY-SYNC-001",
      platform: "shopify",
      quantity: 1,
      product_name: "Comeaway Sleep Mask",
    });
    assert(res.statusCode === 400, "Shopify without email should 400");

    // 4) Match updates all 3 rows, no redeem
    res = await call(matchEntitlements, {
      order_suffix: "9272258",
      customer_email: "customer@example.com",
    });
    assert(res.statusCode === 200, `Match expected 200, got ${res.statusCode}: ${JSON.stringify(res.body)}`);
    assert(res.body.updated_count === 3, `updated_count expected 3, got ${res.body.updated_count}`);
    assert(
      res.body.entitlements.every(
        (e) =>
          e.customerEmail === "customer@example.com" &&
          e.assignedTo === "customer@example.com" &&
          e.redeemed === false
      ),
      "Match should set emails and leave redeemed false"
    );

    // 5) Ambiguity across distinct orders → 409
    await cleanup(["702-6674459-9272258"]);
    await call(syncEntitlements, {
      order_number: "702-6674459-9272258",
      platform: "amazon",
      quantity: 1,
      product_name: "Comeaway Sleep Mask",
    });
    await call(syncEntitlements, {
      order_number: "113-8993219-9272258",
      platform: "amazon",
      quantity: 1,
      product_name: "Comeaway Sleep Mask",
    });
    res = await call(matchEntitlements, {
      order_suffix: "9272258",
      customer_email: "customer@example.com",
    });
    assert(res.statusCode === 409, `Ambiguous suffix expected 409, got ${res.statusCode}`);
    assert(
      Array.isArray(res.body.order_numbers) && res.body.order_numbers.length === 2,
      "409 should list distinct order_numbers"
    );

    // 6) Legacy AMAZON_PENDING_ still matches
    await cleanup(["702-6674459-9272258", "113-8993219-9272258"]);
    const legacy = await Entitlement.create({
      entitlementId: "LEGACY",
      productName: "Comeaway Sleep Mask",
      orderNumber: "702-6674459-9272258",
      customerEmail: "amazon_pending_702-6674459-9272258",
      assignedTo: "amazon_pending_702-6674459-9272258",
      platform: "amazon",
      syncUnitIndex: 1,
      expiryDate: new Date("2030-01-01"),
      redeemed: false,
    });
    res = await call(matchEntitlements, {
      order_suffix: "9272258",
      customer_email: "legacy@example.com",
    });
    assert(res.statusCode === 200, `Legacy match expected 200, got ${res.statusCode}`);
    assert(res.body.updated_count === 1, "Legacy match updated_count 1");
    const refreshed = await Entitlement.findById(legacy._id);
    assert(refreshed.assignedTo === "legacy@example.com", "Legacy assignedTo updated");
    assert(refreshed.redeemed === false, "Legacy should not auto-redeem");

    // 7) Expire without date → UTC now
    await call(syncEntitlements, {
      order_number: "VERIFY-EXPIRE-001",
      platform: "shopify",
      quantity: 2,
      product_name: "Comeaway Sleep Mask",
      customer_email: "buyer@example.com",
    });
    const before = Date.now();
    res = await call(expireEntitlements, { order_number: "VERIFY-EXPIRE-001" });
    const after = Date.now();
    assert(res.statusCode === 200, `Expire expected 200, got ${res.statusCode}`);
    assert(res.body.updated_count === 2, "Expire updated_count 2");
    const expiryMs = new Date(res.body.expiry_date).getTime();
    assert(
      expiryMs >= before - 1000 && expiryMs <= after + 1000,
      "expiry_date should be ~now UTC"
    );
    assert(
      typeof res.body.expiry_date === "string" && res.body.expiry_date.endsWith("Z"),
      "expiry_date should be ISO UTC string"
    );

    console.log("All entitlement automation checks passed.");
  } finally {
    await cleanup(orders);
    await mongoose.disconnect();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
