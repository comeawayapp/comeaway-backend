/**
 * Sound narrator/author API tests (in-memory Mongo).
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || "re_test_dummy";
process.env.STRIPE_SECRET_KEY =
  process.env.STRIPE_SECRET_KEY || "sk_test_dummy_for_sound_tests";

const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const User = require("../../models/user");
const Sound = require("../../models/sound");
const Narrator = require("../../models/Narrator");
const Category = require("../../models/catagories");

let mongo;
let app;
let staffUser;
let category;
let narratorA;
let narratorB;

function createApp() {
  const application = express();
  application.use(express.json());
  application.use("/api/sounds", require("../../router/soundRoutes"));
  return application;
}

function authHeader(user) {
  const token = jwt.sign({ _id: user._id.toString() }, process.env.JWT_SECRET);
  return `Bearer ${token}`;
}

function baseSoundPayload(overrides = {}) {
  return {
    title: `Track-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    description: "Test",
    categories: [category._id.toString()],
    status: "Standard",
    thumbnail: "https://example.com/thumb.jpg",
    soundFile: "https://example.com/sound.mp3",
    duration: 120,
    ...overrides,
  };
}

describe("Sound narrator + author", () => {
  before(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    app = createApp();

    staffUser = await User.create({
      firstname: "Staff",
      lastname: "User",
      email: "sound-staff@example.com",
      password: "hashed",
      role: "admin",
      accountType: "pro",
      isPro: true,
    });

    category = await Category.create({
      name: `Cat-${Date.now()}`,
      slug: `cat-${Date.now()}`,
      description: "test",
    });

    narratorA = await Narrator.create({ name: "Alice Voice" });
    narratorB = await Narrator.create({ name: "Bob Voice" });
  });

  after(async () => {
    await mongoose.disconnect();
    if (mongo) await mongo.stop();
  });

  beforeEach(async () => {
    await Sound.deleteMany({});
  });

  it("creates a sound with narrator and author", async () => {
    const res = await request(app)
      .post("/api/sounds/add-sounds")
      .set("Authorization", authHeader(staffUser))
      .send(
        baseSoundPayload({
          narrator: narratorA._id.toString(),
          author: "Jane Author",
        })
      );

    assert.equal(res.status, 201);
    const saved = await Sound.findById(res.body.soundId);
    assert.equal(String(saved.narrator), String(narratorA._id));
    assert.equal(saved.author, "Jane Author");
  });

  it("rejects invalid narrator id on create", async () => {
    const res = await request(app)
      .post("/api/sounds/add-sounds")
      .set("Authorization", authHeader(staffUser))
      .send(baseSoundPayload({ narrator: "not-an-objectid" }));

    assert.equal(res.status, 400);
    assert.match(res.body.message, /Invalid narrator/i);
  });

  it("filters getSounds by narrator and author", async () => {
    await Sound.create({
      title: "A1",
      categories: [category._id],
      status: "Standard",
      thumbnail: "https://example.com/t.jpg",
      soundFile: "https://example.com/s.mp3",
      duration: 10,
      narrator: narratorA._id,
      author: "Alpha Writer",
      uploadStatus: "completed",
    });
    await Sound.create({
      title: "B1",
      categories: [category._id],
      status: "Standard",
      thumbnail: "https://example.com/t.jpg",
      soundFile: "https://example.com/s.mp3",
      duration: 10,
      narrator: narratorB._id,
      author: "Beta Writer",
      uploadStatus: "completed",
    });

    const byNarrator = await request(app)
      .get("/api/sounds/getSounds")
      .query({ narrator: narratorA._id.toString() })
      .set("Authorization", authHeader(staffUser));

    assert.equal(byNarrator.status, 200);
    assert.equal(byNarrator.body.length, 1);
    assert.equal(byNarrator.body[0].title, "A1");
    assert.equal(byNarrator.body[0].narrator.name, "Alice Voice");

    const byAuthor = await request(app)
      .get("/api/sounds/getSounds")
      .query({ author: "beta" })
      .set("Authorization", authHeader(staffUser));

    assert.equal(byAuthor.status, 200);
    assert.equal(byAuthor.body.length, 1);
    assert.equal(byAuthor.body[0].title, "B1");
  });

  it("lists sounds by narrator id", async () => {
    await Sound.create({
      title: "Narrator Track",
      categories: [category._id],
      status: "Standard",
      thumbnail: "https://example.com/t.jpg",
      soundFile: "https://example.com/s.mp3",
      duration: 10,
      narrator: narratorA._id,
      author: "Someone",
      uploadStatus: "completed",
    });

    const res = await request(app)
      .get(`/api/sounds/by-narrator/${narratorA._id}`)
      .set("Authorization", authHeader(staffUser));

    assert.equal(res.status, 200);
    assert.equal(res.body.narrator.name, "Alice Voice");
    assert.equal(res.body.sounds.length, 1);
    assert.equal(res.body.sounds[0].title, "Narrator Track");
  });
});
