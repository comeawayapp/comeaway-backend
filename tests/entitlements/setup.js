/**
 * Isolated Express + MongoDB Memory Server for entitlement automation tests.
 */
process.env.ENTITLEMENT_AUTOMATION_API_KEY =
  process.env.ENTITLEMENT_AUTOMATION_API_KEY || "test-entitlement-automation-key";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || "re_test_dummy";

const express = require("express");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const Entitlement = require("../../models/Entitlement");

const API_KEY = process.env.ENTITLEMENT_AUTOMATION_API_KEY;

let mongo;
let app;

function createApp() {
  const application = express();
  application.use(express.json());
  application.use(
    "/api/v1/entitlements",
    require("../../router/entitlementAutomationRoutes")
  );
  return application;
}

async function startTestEnv() {
  if (mongoose.connection.readyState === 1 && app) {
    return { app, API_KEY };
  }
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Entitlement.syncIndexes();
  app = createApp();
  return { app, API_KEY };
}

async function stopTestEnv() {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
}

async function clearEntitlements() {
  await Entitlement.deleteMany({});
}

function uniqueOrder(prefix = "ORD") {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

module.exports = {
  API_KEY,
  createApp,
  startTestEnv,
  stopTestEnv,
  clearEntitlements,
  uniqueOrder,
  getApp: () => app,
};
