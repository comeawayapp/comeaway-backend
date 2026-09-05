const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const Subscription = require("../../models/Subscription");
const {
  startTestEnv,
  stopTestEnv,
  getApp,
  clearData,
  createUser,
  createSubscription,
  authHeader,
} = require("./setup");

describe("PUT /api/subscription/me/preferences", () => {
  before(async () => {
    await startTestEnv();
  });

  after(async () => {
    await stopTestEnv();
  });

  beforeEach(async () => {
    await clearData();
  });

  it("returns 400 when body is empty", async () => {
    const user = await createUser();
    await createSubscription(user._id);

    const res = await request(getApp())
      .put("/api/subscription/me/preferences")
      .set("Authorization", authHeader(user))
      .send({});

    assert.equal(res.status, 400);
  });

  it("returns 404 with no subscription", async () => {
    const user = await createUser();
    const res = await request(getApp())
      .put("/api/subscription/me/preferences")
      .set("Authorization", authHeader(user))
      .send({ allow_2_days_reminder: false });

    assert.equal(res.status, 404);
  });

  it("PUT updates cancellation_reason and allow_2_days_reminder", async () => {
    const user = await createUser();
    const sub = await createSubscription(user._id, {
      cancelAtPeriodEnd: false,
    });

    const res = await request(getApp())
      .put("/api/subscription/me/preferences")
      .set("Authorization", authHeader(user))
      .send({
        cancellation_reason: "Too expensive",
        allow_2_days_reminder: false,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.cancellation_reason, "Too expensive");
    assert.equal(res.body.allow_2_days_reminder, false);
    assert.equal(res.body.unchanged_cancel_state, true);
    assert.equal(res.body.cancel_at_period_end, false);

    const refreshed = await Subscription.findById(sub._id);
    assert.equal(refreshed.cancellationReason, "Too expensive");
    assert.equal(refreshed.allowTwoDayReminder, false);
    assert.equal(refreshed.cancelAtPeriodEnd, false);
    assert.equal(refreshed.status, "active");
  });

  it("updates preferences with PUT", async () => {
    const user = await createUser();
    await createSubscription(user._id);

    const res = await request(getApp())
      .put("/api/subscription/me/preferences")
      .set("Authorization", authHeader(user))
      .send({ cancellation_reason: "Switching plans" });

    assert.equal(res.status, 200);
    assert.equal(res.body.cancellation_reason, "Switching plans");
    assert.equal(res.body.allow_2_days_reminder, true);
  });

  it("does not change Stripe cancel state", async () => {
    const user = await createUser();
    const sub = await createSubscription(user._id, {
      cancelAtPeriodEnd: true,
      status: "active",
    });

    const res = await request(getApp())
      .put("/api/subscription/me/preferences")
      .set("Authorization", authHeader(user))
      .send({ allow_2_days_reminder: true });

    assert.equal(res.status, 200);
    assert.equal(res.body.cancel_at_period_end, true);
    assert.equal(res.body.status, "active");

    const refreshed = await Subscription.findById(sub._id);
    assert.equal(refreshed.cancelAtPeriodEnd, true);
    assert.equal(refreshed.status, "active");
  });
});
