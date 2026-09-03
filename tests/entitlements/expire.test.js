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

function expire() {
  return request(getApp())
    .post("/api/v1/entitlements/expire")
    .set("x-api-key", API_KEY);
}

function sync() {
  return request(getApp())
    .post("/api/v1/entitlements/sync")
    .set("x-api-key", API_KEY);
}

describe("POST /api/v1/entitlements/expire", () => {
  before(async () => {
    await startTestEnv();
  });

  after(async () => {
    await stopTestEnv();
  });

  beforeEach(async () => {
    await clearEntitlements();
  });

  it("requires order_number", async () => {
    const res = await expire().send({});
    assert.equal(res.status, 400);
    assert.match(res.body.error, /order_number/);
  });

  it("rejects invalid expiry_date", async () => {
    const res = await expire().send({
      order_number: "SH-1",
      expiry_date: "not-a-date",
    });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /Invalid expiry_date/);
  });

  it("returns 404 when order has no entitlements", async () => {
    const res = await expire().send({ order_number: "DOES-NOT-EXIST" });
    assert.equal(res.status, 404);
  });

  it("expires every row for the full order_number", async () => {
    const order = uniqueOrder("SH");
    await sync().send({
      order_number: order,
      platform: "shopify",
      quantity: 3,
      product_name: "Comeaway Sleep Mask",
      customer_email: "buyer@example.com",
    });

    const res = await expire().send({
      order_number: order,
      expiry_date: "2026-08-01T00:00:00.000Z",
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.updated_count, 3);
    assert.equal(res.body.expiry_date, "2026-08-01T00:00:00.000Z");
    for (const row of res.body.entitlements) {
      assert.equal(
        new Date(row.expiryDate).toISOString(),
        "2026-08-01T00:00:00.000Z"
      );
    }
  });

  it("uses current UTC instant when expiry_date is omitted", async () => {
    const order = uniqueOrder("SH");
    await sync().send({
      order_number: order,
      platform: "shopify",
      quantity: 2,
      product_name: "Comeaway Sleep Mask",
      customer_email: "buyer@example.com",
    });

    const before = Date.now();
    const res = await expire().send({ order_number: order });
    const after = Date.now();

    assert.equal(res.status, 200);
    assert.equal(res.body.updated_count, 2);
    assert.ok(typeof res.body.expiry_date === "string");
    assert.ok(res.body.expiry_date.endsWith("Z"));
    const ms = new Date(res.body.expiry_date).getTime();
    assert.ok(ms >= before - 2000 && ms <= after + 2000);

    const rows = await Entitlement.find({ orderNumber: order });
    for (const row of rows) {
      assert.equal(row.expiryDate.toISOString(), res.body.expiry_date);
    }
  });
});
