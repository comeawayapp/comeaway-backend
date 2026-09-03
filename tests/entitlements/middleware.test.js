const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const requireApiKey = require("../../middleware/requireApiKey");

function mockRes() {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

describe("requireApiKey middleware", () => {
  it("returns 503 when ENTITLEMENT_AUTOMATION_API_KEY is not configured", () => {
    const saved = process.env.ENTITLEMENT_AUTOMATION_API_KEY;
    delete process.env.ENTITLEMENT_AUTOMATION_API_KEY;
    const req = { header: () => undefined };
    const res = mockRes();
    let nextCalled = false;
    requireApiKey(req, res, () => {
      nextCalled = true;
    });
    process.env.ENTITLEMENT_AUTOMATION_API_KEY = saved;
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.code, "AUTOMATION_NOT_CONFIGURED");
    assert.equal(nextCalled, false);
  });
});
