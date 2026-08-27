/**
 * Machine-to-machine auth for automation endpoints (Shopify/Amazon/Klaviyo bridge).
 * Accepts x-api-key header or Authorization: Bearer <key>
 */
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

  const provided = headerKey || bearerKey;
  if (!provided || provided !== configured) {
    return res.status(401).json({
      error: "Invalid or missing API key",
      code: "INVALID_API_KEY",
    });
  }

  return next();
};
