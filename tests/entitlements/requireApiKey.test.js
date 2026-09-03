const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { startTestEnv, stopTestEnv, getApp, API_KEY } = require("./setup");

describe("Entitlement automation auth", () => {
  before(async () => {
    await startTestEnv();
  });

  after(async () => {
    await stopTestEnv();
  });

  it("returns 401 when x-api-key is missing", async () => {
    const res = await request(getApp())
      .post("/api/v1/entitlements/sync")
      .send({
        order_number: "SH-1",
        platform: "shopify",
        quantity: 1,
        product_name: "Comeaway Sleep Mask",
        customer_email: "a@b.com",
      });
    assert.equal(res.status, 401);
    assert.equal(res.body.code, "INVALID_API_KEY");
  });

  it("returns 401 when x-api-key is wrong", async () => {
    const res = await request(getApp())
      .post("/api/v1/entitlements/sync")
      .set("x-api-key", "wrong-key")
      .send({
        order_number: "SH-1",
        platform: "shopify",
        quantity: 1,
        product_name: "Comeaway Sleep Mask",
        customer_email: "a@b.com",
      });
    assert.equal(res.status, 401);
    assert.equal(res.body.code, "INVALID_API_KEY");
  });

  it("accepts x-api-key (preferred)", async () => {
    const res = await request(getApp())
      .post("/api/v1/entitlements/sync")
      .set("x-api-key", API_KEY)
      .send({
        order_number: "SH-AUTH-1",
        platform: "shopify",
        quantity: 1,
        product_name: "Comeaway Sleep Mask",
        customer_email: "a@b.com",
      });
    assert.ok([200, 201].includes(res.status));
  });

  it("accepts Authorization Bearer for compatibility", async () => {
    const res = await request(getApp())
      .post("/api/v1/entitlements/sync")
      .set("Authorization", `Bearer ${API_KEY}`)
      .send({
        order_number: "SH-AUTH-2",
        platform: "shopify",
        quantity: 1,
        product_name: "Comeaway Sleep Mask",
        customer_email: "a@b.com",
      });
    assert.ok([200, 201].includes(res.status));
  });
});
