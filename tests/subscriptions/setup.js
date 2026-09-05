/**
 * Isolated Express + MongoDB Memory Server for subscription tests.
 * Env must be set before requiring modules that read Stripe/JWT.
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || "re_test_dummy";
process.env.STRIPE_SECRET_KEY =
  process.env.STRIPE_SECRET_KEY || "sk_test_dummy_for_subscription_tests";

const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { MongoMemoryServer } = require("mongodb-memory-server");
const User = require("../../models/user");
const Subscription = require("../../models/Subscription");
const Payment = require("../../models/Payment");
const Entitlement = require("../../models/Entitlement");
const emailService = require("../../services/emailService");

let mongo;
let app;
let reminderCalls = [];

function createApp() {
  const application = express();
  application.use(express.json());
  application.use("/api/subscription", require("../../router/subscriptionRoutes"));
  return application;
}

async function startTestEnv() {
  if (mongoose.connection.readyState === 1 && app) {
    return { app };
  }
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  app = createApp();

  reminderCalls = [];
  emailService.sendSubscriptionExpiryReminder = async (
    email,
    firstName,
    endDate,
    plan
  ) => {
    reminderCalls.push({ email, firstName, endDate, plan });
    return { id: "test-email" };
  };

  return { app };
}

async function stopTestEnv() {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
  app = null;
}

async function clearData() {
  await Promise.all([
    User.deleteMany({}),
    Subscription.deleteMany({}),
    Payment.deleteMany({}),
    Entitlement.deleteMany({}),
  ]);
  reminderCalls = [];
}

async function createUser(overrides = {}) {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  return User.create({
    firstname: "Test",
    lastname: "User",
    email: `user-${suffix}@example.com`,
    password: "hashed-password",
    isPro: true,
    ...overrides,
  });
}

async function createSubscription(userId, overrides = {}) {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  const periodStart = new Date();
  const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return Subscription.create({
    userId,
    stripeSubscriptionId: `sub_test_${suffix}`,
    stripeCustomerId: `cus_test_${suffix}`,
    stripePriceId: `prod_not_stripe_${suffix}`,
    status: "active",
    plan: "monthly",
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    startDate: periodStart,
    endDate: periodEnd,
    allowTwoDayReminder: true,
    ...overrides,
  });
}

async function createPayment(userId, subscriptionId, overrides = {}) {
  return Payment.create({
    userId,
    subscriptionId,
    amount: 299,
    currency: "usd",
    status: "succeeded",
    customerId: "cus_test",
    processingType: "subscription",
    ...overrides,
  });
}

function authHeader(user) {
  const token = jwt.sign({ _id: user._id.toString() }, process.env.JWT_SECRET);
  return `Bearer ${token}`;
}

function getReminderCalls() {
  return reminderCalls;
}

module.exports = {
  startTestEnv,
  stopTestEnv,
  clearData,
  createUser,
  createSubscription,
  createPayment,
  authHeader,
  getReminderCalls,
  getApp: () => app,
};
