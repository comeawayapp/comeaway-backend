/**
 * Mix + MixCategory API tests (in-memory Mongo).
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || "re_test_dummy";
process.env.STRIPE_SECRET_KEY =
  process.env.STRIPE_SECRET_KEY || "sk_test_dummy_for_mix_tests";

const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const User = require("../../models/user");
const Mix = require("../../models/mix");
const MixCategory = require("../../models/mixCategory");

let mongo;
let app;
let staffUser;
let mixCategory;

function createApp() {
  const application = express();
  application.use(express.json());
  application.use("/api/mixes", require("../../router/mixRoutes"));
  application.use(
    "/api/mix-categories",
    require("../../router/mixCategoryRoutes")
  );
  return application;
}

function authHeader(user) {
  const token = jwt.sign({ _id: user._id.toString() }, process.env.JWT_SECRET);
  return `Bearer ${token}`;
}

describe("Mix + MixCategory", () => {
  before(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    app = createApp();

    staffUser = await User.create({
      firstname: "Staff",
      lastname: "User",
      email: "mix-staff@example.com",
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
    await Mix.deleteMany({});
    await MixCategory.deleteMany({});

    mixCategory = await MixCategory.create({
      name: `Nature-${Date.now()}`,
      slug: `nature-${Date.now()}`,
      description: "Nature sounds",
    });
  });

  it("creates a mix category", async () => {
    const res = await request(app)
      .post("/api/mix-categories/create")
      .set("Authorization", authHeader(staffUser))
      .send({ name: "Animals", slug: "animals", description: "Animal sounds" });

    assert.equal(res.status, 201);
    assert.equal(res.body.category.name, "Animals");
  });

  it("lists mix categories", async () => {
    const res = await request(app)
      .get("/api/mix-categories")
      .set("Authorization", authHeader(staffUser));

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.equal(res.body.length, 1);
  });

  it("creates a mix and lists it", async () => {
    const createRes = await request(app)
      .post("/api/mixes/add-mix")
      .set("Authorization", authHeader(staffUser))
      .send({
        title: `Rain-${Date.now()}`,
        description: "Rain on tin",
        categories: [mixCategory._id.toString()],
        status: "Standard",
        thumbnail: "https://example.com/thumb.jpg",
        soundFile: "https://example.com/rain.mp3",
        duration: 30,
      });

    assert.equal(createRes.status, 201);
    assert.ok(createRes.body.mixId);

    const listRes = await request(app)
      .get("/api/mixes/getMixes")
      .set("Authorization", authHeader(staffUser));

    assert.equal(listRes.status, 200);
    assert.equal(listRes.body.length, 1);
    assert.equal(listRes.body[0]._id, createRes.body.mixId);
  });

  it("returns category with its mixes", async () => {
    await Mix.create({
      title: "Arctic wind",
      categories: [mixCategory._id],
      status: "Standard",
      thumbnail: "https://example.com/t.jpg",
      soundFile: "https://example.com/s.mp3",
      duration: 20,
      uploadStatus: "completed",
    });

    const res = await request(app)
      .get(`/api/mix-categories/${mixCategory._id}/mixes`)
      .set("Authorization", authHeader(staffUser));

    assert.equal(res.status, 200);
    assert.equal(res.body.category._id, String(mixCategory._id));
    assert.equal(res.body.mixes.length, 1);
    assert.equal(res.body.mixes[0].title, "Arctic wind");
  });

  it("updates and deletes a mix", async () => {
    const mix = await Mix.create({
      title: "Ocean",
      categories: [mixCategory._id],
      status: "Standard",
      thumbnail: "https://example.com/t.jpg",
      soundFile: "https://example.com/s.mp3",
      duration: 15,
      uploadStatus: "completed",
    });

    const updateRes = await request(app)
      .put(`/api/mixes/updateMix/${mix._id}`)
      .set("Authorization", authHeader(staffUser))
      .send({ title: "Ocean waves" });

    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.mix.title, "Ocean waves");

    const deleteRes = await request(app)
      .delete(`/api/mixes/deleteMix/${mix._id}`)
      .set("Authorization", authHeader(staffUser));

    assert.equal(deleteRes.status, 200);
    assert.equal(await Mix.countDocuments(), 0);
  });
});
