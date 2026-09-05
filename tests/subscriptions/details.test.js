const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const {
  startTestEnv,
  stopTestEnv,
  getApp,
  clearData,
  createUser,
  createSubscription,
  createPayment,
  authHeader,
} = require("./setup");

describe("GET /api/subscription/me/details", () => {
  before(async () => {
    await startTestEnv();
  });

  after(async () => {
    await stopTestEnv();
  });

  beforeEach(async () => {
    await clearData();
  });

  it("returns 401 when unauthenticated", async () => {
    const res = await request(getApp()).get("/api/subscription/me/details");
    assert.equal(res.status, 401);
  });

  it("returns 404 when user has no Subscription", async () => {
    const user = await createUser();
    const res = await request(getApp())
      .get("/api/subscription/me/details")
      .set("Authorization", authHeader(user));
    assert.equal(res.status, 404);
    assert.equal(res.body.code, "SUBSCRIPTION_NOT_FOUND");
  });

  it("returns plan, start_date, end_date from period fields", async () => {
    const user = await createUser();
    const start = new Date("2030-01-01T00:00:00.000Z");
    const end = new Date("2030-02-01T00:00:00.000Z");
    const sub = await createSubscription(user._id, {
      plan: "annual",
      currentPeriodStart: start,
      currentPeriodEnd: end,
    });

    const res = await request(getApp())
      .get("/api/subscription/me/details")
      .set("Authorization", authHeader(user));

    assert.equal(res.status, 200);
    assert.equal(res.body.plan, "annual");
    assert.equal(new Date(res.body.start_date).toISOString(), start.toISOString());
    assert.equal(new Date(res.body.end_date).toISOString(), end.toISOString());
    assert.equal(String(res.body.subscription_id), String(sub._id));
    assert.equal(res.body.allow_2_days_reminder, true);
  });

  it("returns price from latest successful Payment (cents → dollars)", async () => {
    const user = await createUser();
    const sub = await createSubscription(user._id);
    await createPayment(user._id, sub._id, { amount: 199 });
    await createPayment(user._id, sub._id, { amount: 499 });

    const res = await request(getApp())
      .get("/api/subscription/me/details")
      .set("Authorization", authHeader(user));

    assert.equal(res.status, 200);
    assert.equal(res.body.price_cents, 499);
    assert.equal(res.body.price, 4.99);
    assert.equal(res.body.currency, "usd");
  });

  it("returns price null when no Payment and Stripe unavailable", async () => {
    const user = await createUser();
    await createSubscription(user._id, {
      stripePriceId: "price_fake_offline",
    });

    const res = await request(getApp())
      .get("/api/subscription/me/details")
      .set("Authorization", authHeader(user));

    assert.equal(res.status, 200);
    assert.equal(res.body.price, null);
    assert.equal(res.body.price_cents, null);
  });

  it("prefers active/trialing over canceled rows", async () => {
    const user = await createUser();
    await createSubscription(user._id, {
      status: "canceled",
      plan: "daily",
      currentPeriodEnd: new Date("2031-01-01T00:00:00.000Z"),
    });
    await createSubscription(user._id, {
      status: "active",
      plan: "monthly",
      currentPeriodEnd: new Date("2030-06-01T00:00:00.000Z"),
    });

    const res = await request(getApp())
      .get("/api/subscription/me/details")
      .set("Authorization", authHeader(user));

    assert.equal(res.status, 200);
    assert.equal(res.body.plan, "monthly");
    assert.equal(res.body.status, "active");
  });
});
