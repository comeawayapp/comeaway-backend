/**
 * Machine-to-machine auth for automation endpoints (Shopify/Amazon/Klaviyo bridge).
 * Preferred: x-api-key: <ENTITLEMENT_AUTOMATION_API_KEY>
 * Also accepts Authorization: Bearer <key> for compatibility.
 */
const crypto = require("crypto");

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = function requireApiKey(req, res, next) {
  const configured = process.env.ENTITLEMENT_AUTOMATION_API_KEY;
  if (!configured) {
    return res.status(503).json({
      error: "Entitlement automation is not configured",
      code: "AUTOMATION_NOT_CONFIGURED",
    });
  }

  const headerKey = req.header("x-api-key");
  const authHeader = req.header("Authorization") || "";
  const bearerKey = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  // Prefer x-api-key; fall back to Bearer
  const provided = headerKey || bearerKey;
  if (!provided || !safeEqual(provided, configured)) {
    return res.status(401).json({
      error: "Invalid or missing API key",
      code: "INVALID_API_KEY",
    });
  }

  return next();
};
