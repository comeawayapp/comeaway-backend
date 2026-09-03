const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const Entitlement = require("../../models/Entitlement");
const {
  startTestEnv,
  stopTestEnv,
  getApp,
  API_KEY,
  clearEntitlements,
  uniqueOrder,
} = require("./setup");

function auth() {
  return request(getApp())
    .post("/api/v1/entitlements/sync")
    .set("x-api-key", API_KEY);
}

describe("POST /api/v1/entitlements/sync", () => {
  before(async () => {
    await startTestEnv();
  });

  after(async () => {
    await stopTestEnv();
  });

  beforeEach(async () => {
    await clearEntitlements();
  });

  it("rejects missing required fields", async () => {
    const res = await auth().send({ platform: "amazon", quantity: 1 });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /order_number/);
  });

  it("rejects invalid quantity", async () => {
    const res = await auth().send({
      order_number: uniqueOrder(),
      platform: "amazon",
      quantity: 0,
      product_name: "Comeaway Sleep Mask",
    });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /quantity/);
  });

  it("rejects invalid platform", async () => {
    const res = await auth().send({
      order_number: uniqueOrder(),
      platform: "ebay",
      quantity: 1,
      product_name: "Comeaway Sleep Mask",
    });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /Invalid platform/);
  });

  it("requires customer_email for Shopify", async () => {
    const res = await auth().send({
      order_number: uniqueOrder("SH"),
      platform: "shopify",
      quantity: 1,
      product_name: "Comeaway Sleep Mask",
    });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /customer_email is required/);
  });

  it("creates N Shopify rows with buyer email on both fields", async () => {
    const order = uniqueOrder("SH");
    const res = await auth().send({
      order_number: order,
      customer_name: "John Doe",
      customer_email: "John@Example.com",
      platform: "shopify",
      quantity: 3,
      product_name: "Comeaway Sleep Mask",
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.created, 3);
    assert.equal(res.body.total, 3);
    assert.equal(res.body.entitlements.length, 3);
    const ids = new Set(res.body.entitlements.map((e) => e.entitlementId));
    assert.equal(ids.size, 3);
    for (const row of res.body.entitlements) {
      assert.equal(row.customerEmail, "john@example.com");
      assert.equal(row.assignedTo, "john@example.com");
      assert.equal(row.platform, "shopify");
      assert.equal(row.redeemed, false);
      assert.equal(row.productName, "Comeaway Sleep Mask");
      assert.ok(row.syncUnitIndex >= 1 && row.syncUnitIndex <= 3);
    }
  });

  it("creates Amazon rows with null emails (no placeholder required)", async () => {
    const order = "702-6674459-9272258";
    const res = await auth().send({
      order_number: order,
      customer_name: "Sarah",
      platform: "amazon",
      quantity: 3,
      product_name: "Comeaway Sleep Mask",
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.created, 3);
    for (const row of res.body.entitlements) {
      assert.equal(row.customerEmail, null);
      assert.equal(row.assignedTo, null);
      assert.equal(row.platform, "amazon");
      assert.equal(row.redeemed, false);
    }
    const inDb = await Entitlement.find({ orderNumber: order });
    assert.equal(inDb.length, 3);
  });

  it("treats Amazon.ca as amazon", async () => {
    const order = uniqueOrder("701");
    const res = await auth().send({
      order_number: order,
      platform: "Amazon.ca",
      quantity: 1,
      product_name: "Comeaway Sleep Mask",
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.entitlements[0].platform, "amazon");
  });

  it("strips AMAZON_PENDING_ if accidentally sent and stores null", async () => {
    const order = uniqueOrder("701");
    const res = await auth().send({
      order_number: order,
      platform: "amazon",
      quantity: 1,
      product_name: "Comeaway Sleep Mask",
      customer_email: `AMAZON_PENDING_${order}`,
      assigned_to: `AMAZON_PENDING_${order}`,
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.entitlements[0].customerEmail, null);
    assert.equal(res.body.entitlements[0].assignedTo, null);
  });

  it("is idempotent: retry does not duplicate rows", async () => {
    const order = uniqueOrder("SH");
    const payload = {
      order_number: order,
      customer_email: "buyer@example.com",
      platform: "shopify",
      quantity: 3,
      product_name: "Comeaway Sleep Mask",
    };
    const first = await auth().send(payload);
    assert.equal(first.status, 201);
    assert.equal(first.body.created, 3);

    const second = await auth().send(payload);
    assert.equal(second.status, 200);
    assert.equal(second.body.created, 0);
    assert.equal(second.body.total, 3);
    assert.match(second.body.message, /idempotent/i);

    const count = await Entitlement.countDocuments({ orderNumber: order });
    assert.equal(count, 3);
  });

  it("is idempotent under concurrent retries", async () => {
    const order = uniqueOrder("AMZ");
    const payload = {
      order_number: order,
      platform: "amazon",
      quantity: 2,
      product_name: "Comeaway Sleep Mask",
    };
    const [a, b] = await Promise.all([auth().send(payload), auth().send(payload)]);
    assert.ok([200, 201].includes(a.status));
    assert.ok([200, 201].includes(b.status));
    const count = await Entitlement.countDocuments({
      platform: "amazon",
      orderNumber: order,
    });
    assert.equal(count, 2);
    const createdSum = a.body.created + b.body.created;
    assert.equal(createdSum, 2);
  });

  it("defaults expiry to ~5 years when omitted", async () => {
    const order = uniqueOrder("SH");
    const res = await auth().send({
      order_number: order,
      customer_email: "buyer@example.com",
      platform: "shopify",
      quantity: 1,
      product_name: "Comeaway Sleep Mask",
    });
    const expiry = new Date(res.body.entitlements[0].expiryDate);
    const fiveYears = new Date();
    fiveYears.setFullYear(fiveYears.getFullYear() + 5);
    const diffDays = Math.abs(expiry - fiveYears) / (1000 * 60 * 60 * 24);
    assert.ok(diffDays < 2, "expiry should be about 5 years from now");
  });
});
