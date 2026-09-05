const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const {
  startTestEnv,
  stopTestEnv,
  clearData,
  createUser,
  createSubscription,
  getReminderCalls,
} = require("./setup");
const Subscription = require("../../models/Subscription");
const Entitlement = require("../../models/Entitlement");
const {
  sendTwoDayExpiryReminders,
} = require("../../controllers/subscriptionController");

function daysFromNow(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

describe("sendTwoDayExpiryReminders", () => {
  before(async () => {
    await startTestEnv();
  });

  after(async () => {
    await stopTestEnv();
  });

  beforeEach(async () => {
    await clearData();
  });

  it("emails when allowTwoDayReminder and period end in 2-day window", async () => {
    const user = await createUser({ email: "remind@example.com" });
    const periodEnd = daysFromNow(2);
    const sub = await createSubscription(user._id, {
      currentPeriodEnd: periodEnd,
      endDate: periodEnd,
      allowTwoDayReminder: true,
      plan: "monthly",
    });

    const result = await sendTwoDayExpiryReminders();
    assert.equal(result.sent, 1);
    assert.equal(getReminderCalls().length, 1);
    assert.equal(getReminderCalls()[0].email, "remind@example.com");

    const refreshed = await Subscription.findById(sub._id);
    assert.ok(refreshed.expiryReminderSentForPeriodEnd);
    assert.equal(
      refreshed.expiryReminderSentForPeriodEnd.toISOString(),
      periodEnd.toISOString()
    );
  });

  it("skips opted-out subscriptions", async () => {
    const user = await createUser();
    const periodEnd = daysFromNow(2);
    await createSubscription(user._id, {
      currentPeriodEnd: periodEnd,
      allowTwoDayReminder: false,
    });

    const result = await sendTwoDayExpiryReminders();
    assert.equal(result.sent, 0);
    assert.equal(getReminderCalls().length, 0);
  });

  it("skips already-sent for the same period end", async () => {
    const user = await createUser();
    const periodEnd = daysFromNow(2);
    await createSubscription(user._id, {
      currentPeriodEnd: periodEnd,
      allowTwoDayReminder: true,
      expiryReminderSentForPeriodEnd: periodEnd,
    });

    const result = await sendTwoDayExpiryReminders();
    assert.equal(result.sent, 0);
    assert.equal(getReminderCalls().length, 0);
  });

  it("does not pick up Entitlement-only Pro users", async () => {
    const user = await createUser({ isPro: true });
    await Entitlement.create({
      entitlementId: "ENTITL",
      productName: "Comeaway Sleep Mask",
      orderNumber: "SH-ENT-1",
      customerEmail: user.email,
      assignedTo: user.email,
      platform: "shopify",
      expiryDate: daysFromNow(2),
      redeemed: true,
      redeemedBy: user._id,
      subscriptionExpiresAt: daysFromNow(2),
    });

    const result = await sendTwoDayExpiryReminders();
    assert.equal(result.sent, 0);
    assert.equal(result.scanned, 0);
    assert.equal(getReminderCalls().length, 0);
  });

  it("re-sends after a new period end", async () => {
    const user = await createUser({ email: "renew@example.com" });
    const oldEnd = daysFromNow(2);
    const sub = await createSubscription(user._id, {
      currentPeriodEnd: oldEnd,
      allowTwoDayReminder: true,
      expiryReminderSentForPeriodEnd: oldEnd,
    });

    let result = await sendTwoDayExpiryReminders();
    assert.equal(result.sent, 0);

    const newEnd = daysFromNow(2.5);
    sub.currentPeriodEnd = newEnd;
    sub.endDate = newEnd;
    await sub.save();

    result = await sendTwoDayExpiryReminders();
    assert.equal(result.sent, 1);
    assert.equal(getReminderCalls().length, 1);

    const refreshed = await Subscription.findById(sub._id);
    assert.equal(
      refreshed.expiryReminderSentForPeriodEnd.toISOString(),
      newEnd.toISOString()
    );
  });
});
