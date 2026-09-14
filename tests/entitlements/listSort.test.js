/**
 * Admin entitlement list sort tests (in-memory Mongo + JWT staff auth).
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || "re_test_dummy";
process.env.STRIPE_SECRET_KEY =
  process.env.STRIPE_SECRET_KEY || "sk_test_dummy_for_entitlement_list";

const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const User = require("../../models/user");
const Entitlement = require("../../models/Entitlement");

let mongo;
let app;
let adminUser;

function createApp() {
  const application = express();
  application.use(express.json());
  application.use("/api/entitlements", require("../../router/entitlementRoutes"));
  return application;
}

function authHeader(user) {
  const token = jwt.sign({ _id: user._id.toString() }, process.env.JWT_SECRET);
  return `Bearer ${token}`;
}

async function seedEntitlements() {
  // Insert with staggered createdAt via update after create (timestamps locked at insert)
  const older = await Entitlement.create({
    entitlementId: "OLD001",
    productName: "Comeaway Sleep Mask",
    orderNumber: "SH-OLD",
    customerEmail: "old@example.com",
    assignedTo: "old@example.com",
    platform: "shopify",
    expiryDate: new Date("2030-06-01T00:00:00.000Z"),
    redeemed: false,
  });
  const newer = await Entitlement.create({
    entitlementId: "NEW001",
    productName: "Comeaway Sleep Mask",
    orderNumber: "SH-NEW",
    customerEmail: "new@example.com",
    assignedTo: "new@example.com",
    platform: "shopify",
    expiryDate: new Date("2028-01-01T00:00:00.000Z"),
    redeemed: false,
  });
  const mid = await Entitlement.create({
    entitlementId: "MID001",
    productName: "Comeaway Sleep Mask",
    orderNumber: "SH-MID",
    customerEmail: "mid@example.com",
    assignedTo: "mid@example.com",
    platform: "amazon",
    expiryDate: new Date("2029-01-01T00:00:00.000Z"),
    redeemed: false,
  });

  // Force distinct createdAt for deterministic default sort
  await Entitlement.collection.updateOne(
    { _id: older._id },
    { $set: { createdAt: new Date("2024-01-01T00:00:00.000Z") } }
  );
  await Entitlement.collection.updateOne(
    { _id: mid._id },
    { $set: { createdAt: new Date("2025-01-01T00:00:00.000Z") } }
  );
  await Entitlement.collection.updateOne(
    { _id: newer._id },
    { $set: { createdAt: new Date("2026-01-01T00:00:00.000Z") } }
  );

  return { older, mid, newer };
}

describe("GET /api/entitlements/admin/entitlements sort", () => {
  before(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    app = createApp();
    adminUser = await User.create({
      firstname: "Admin",
      lastname: "Tester",
      email: "admin-list-sort@example.com",
      password: "hashed",
      role: "admin",
      accountType: "pro",
      isPro: true,
    });
  });

  after(async () => {
    await mongoose.disconnect();
    if (mongo) await mongo.stop();
  });

  beforeEach(async () => {
    await Entitlement.deleteMany({});
  });

  it("defaults to createdAt desc (newest first)", async () => {
    await seedEntitlements();

    const res = await request(app)
      .get("/api/entitlements/admin/entitlements")
      .set("Authorization", authHeader(adminUser));

    assert.equal(res.status, 200);
    assert.equal(res.body.length, 3);
    assert.equal(res.body[0].entitlementId, "NEW001");
    assert.equal(res.body[1].entitlementId, "MID001");
    assert.equal(res.body[2].entitlementId, "OLD001");
    assert.ok(res.body[0].createdAt);
  });

  it("sorts by expiryDate asc", async () => {
    await seedEntitlements();

    const res = await request(app)
      .get("/api/entitlements/admin/entitlements")
      .query({ sortBy: "expiryDate", sortOrder: "asc" })
      .set("Authorization", authHeader(adminUser));

    assert.equal(res.status, 200);
    assert.equal(res.body[0].entitlementId, "NEW001"); // 2028
    assert.equal(res.body[1].entitlementId, "MID001"); // 2029
    assert.equal(res.body[2].entitlementId, "OLD001"); // 2030
  });

  it("returns 400 for invalid sortBy", async () => {
    const res = await request(app)
      .get("/api/entitlements/admin/entitlements")
      .query({ sortBy: "orderNumber" })
      .set("Authorization", authHeader(adminUser));

    assert.equal(res.status, 400);
    assert.match(res.body.error, /Invalid sortBy/);
  });

  it("returns 400 for invalid sortOrder", async () => {
    const res = await request(app)
      .get("/api/entitlements/admin/entitlements")
      .query({ sortOrder: "newest" })
      .set("Authorization", authHeader(adminUser));

    assert.equal(res.status, 400);
    assert.match(res.body.error, /Invalid sortOrder/);
  });
});
