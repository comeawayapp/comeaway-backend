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
} = require("./setup");

function match() {
  return request(getApp())
    .post("/api/v1/entitlements/match")
    .set("x-api-key", API_KEY);
}

function sync() {
  return request(getApp())
    .post("/api/v1/entitlements/sync")
    .set("x-api-key", API_KEY);
}

describe("POST /api/v1/entitlements/match", () => {
  before(async () => {
    await startTestEnv();
  });

  after(async () => {
    await stopTestEnv();
  });

  beforeEach(async () => {
    await clearEntitlements();
  });

  it("rejects missing fields", async () => {
    const res = await match().send({ order_suffix: "9272258" });
    assert.equal(res.status, 400);
  });

  it("rejects non-7-digit suffix", async () => {
    const res = await match().send({
      order_suffix: "123",
      customer_email: "a@b.com",
    });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /7 digits/);
  });

  it("rejects invalid email", async () => {
    const res = await match().send({
      order_suffix: "9272258",
      customer_email: "not-an-email",
    });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /Invalid customer_email/);
  });

  it("returns 404 when nothing pending matches", async () => {
    const res = await match().send({
      order_suffix: "9272258",
      customer_email: "customer@example.com",
    });
    assert.equal(res.status, 404);
  });

  it("updates ALL pending rows for one Amazon order and does not redeem", async () => {
    const order = "702-6674459-9272258";
    const created = await sync().send({
      order_number: order,
      platform: "amazon",
      quantity: 3,
      product_name: "Comeaway Sleep Mask",
    });
    assert.equal(created.status, 201);

    const res = await match().send({
      order_suffix: "9272258",
      customer_email: "Customer@Example.com",
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.updated_count, 3);
    assert.equal(res.body.order_number, order);
    assert.equal(res.body.customer_email, "customer@example.com");
    assert.equal(res.body.entitlements.length, 3);
    assert.equal(res.body.userUpgraded, undefined);
    for (const row of res.body.entitlements) {
      assert.equal(row.customerEmail, "customer@example.com");
      assert.equal(row.assignedTo, "customer@example.com");
      assert.equal(row.redeemed, false);
    }
  });

  it("returns 409 when suffix matches two distinct Amazon orders", async () => {
    await sync().send({
      order_number: "702-6674459-9272258",
      platform: "amazon",
      quantity: 1,
      product_name: "Comeaway Sleep Mask",
    });
    await sync().send({
      order_number: "113-8993219-9272258",
      platform: "amazon",
      quantity: 1,
      product_name: "Comeaway Sleep Mask",
    });

    const res = await match().send({
      order_suffix: "9272258",
      customer_email: "customer@example.com",
    });
    assert.equal(res.status, 409);
    assert.match(res.body.error, /Ambiguous/);
    assert.equal(res.body.order_numbers.length, 2);

    const unchanged = await Entitlement.find({
      orderNumber: { $in: ["702-6674459-9272258", "113-8993219-9272258"] },
    });
    assert.ok(unchanged.every((e) => e.assignedTo == null));
  });

  it("still matches legacy AMAZON_PENDING_ rows without auto-redeem", async () => {
    await Entitlement.create({
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

    const res = await match().send({
      order_suffix: "9272258",
      customer_email: "legacy@example.com",
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.updated_count, 1);
    assert.equal(res.body.entitlements[0].assignedTo, "legacy@example.com");
    assert.equal(res.body.entitlements[0].redeemed, false);
  });

  it("does not match already-assigned Amazon rows as pending", async () => {
    await Entitlement.create({
      entitlementId: "ASSIGN",
      productName: "Comeaway Sleep Mask",
      orderNumber: "702-1111111-9272258",
      customerEmail: "already@example.com",
      assignedTo: "already@example.com",
      platform: "amazon",
      syncUnitIndex: 1,
      expiryDate: new Date("2030-01-01"),
      redeemed: false,
    });

    const res = await match().send({
      order_suffix: "9272258",
      customer_email: "other@example.com",
    });
    assert.equal(res.status, 404);
  });
});
