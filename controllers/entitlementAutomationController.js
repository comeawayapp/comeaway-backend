const Entitlement = require("../models/Entitlement");
const {
  normalizePlatform,
  generateUniqueEntitlementId,
  defaultExpiryDate,
  syncUserProFromEntitlementExpiry,
  VALID_PLATFORMS,
} = require("../utils/entitlementUtils");
const {
  normalizeEmail,
  isAmazonPendingEmail,
  autoRedeemEntitlementIfUserExists,
} = require("./user/entitlementHelper");

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * POST /api/v1/entitlements/sync
 */
exports.syncEntitlements = async (req, res) => {
  try {
    const {
      order_number,
      customer_name,
      customer_email,
      assigned_to,
      platform,
      quantity,
      product_name,
      expiry_date,
      notes,
    } = req.body;

    if (!order_number || !platform || !product_name || !customer_email) {
      return res.status(400).json({
        error:
          "Missing required fields: order_number, platform, product_name, customer_email",
      });
    }

    const qty = parseInt(quantity, 10);
    if (!qty || qty < 1) {
      return res.status(400).json({
        error: "quantity must be a positive integer",
      });
    }

    const normalizedPlatform = normalizePlatform(platform);
    if (!normalizedPlatform) {
      return res.status(400).json({
        error: `Invalid platform. Must normalize to one of: ${VALID_PLATFORMS.join(", ")}`,
      });
    }

    const orderNumber = String(order_number).trim();
    const customerEmail = normalizeEmail(customer_email);
    const assignedTo = normalizeEmail(assigned_to || customer_email);
    const finalExpiry = defaultExpiryDate(expiry_date);

    const existing = await Entitlement.find({ orderNumber }).sort({
      createdAt: 1,
    });
    const existingCount = existing.length;

    if (existingCount >= qty) {
      return res.status(200).json({
        message: "Order already synced (idempotent)",
        order_number: orderNumber,
        created: 0,
        total: existingCount,
        entitlements: existing,
      });
    }

    const toCreate = qty - existingCount;
    const created = [];

    for (let i = 0; i < toCreate; i++) {
      const entitlementId = await generateUniqueEntitlementId();
      const row = await Entitlement.create({
        entitlementId,
        productName: product_name,
        orderNumber,
        customerName: customer_name || undefined,
        customerEmail,
        assignedTo,
        platform: normalizedPlatform,
        expiryDate: finalExpiry,
        notes: notes || undefined,
        redeemed: false,
      });

      if (!isAmazonPendingEmail(assignedTo)) {
        await autoRedeemEntitlementIfUserExists(row);
      }

      const refreshed = await Entitlement.findById(row._id);
      created.push(refreshed);
    }

    const allForOrder = await Entitlement.find({ orderNumber }).sort({
      createdAt: 1,
    });

    return res.status(201).json({
      message: `Created ${created.length} entitlement(s)`,
      order_number: orderNumber,
      created: created.length,
      total: allForOrder.length,
      entitlements: allForOrder,
    });
  } catch (err) {
    console.error("syncEntitlements error:", err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/v1/entitlements/expire
 */
exports.expireEntitlements = async (req, res) => {
  try {
    const { order_number, expiry_date } = req.body;

    if (!order_number) {
      return res.status(400).json({ error: "order_number is required" });
    }

    const orderNumber = String(order_number).trim();
    const newExpiry = expiry_date ? new Date(expiry_date) : new Date();
    if (isNaN(newExpiry.getTime())) {
      return res.status(400).json({ error: "Invalid expiry_date" });
    }

    const entitlements = await Entitlement.find({ orderNumber });
    if (!entitlements.length) {
      return res.status(404).json({
        error: "No entitlements found for this order_number",
        order_number: orderNumber,
      });
    }

    const usersSynced = [];
    for (const entitlement of entitlements) {
      entitlement.expiryDate = newExpiry;
      if (entitlement.redeemed) {
        entitlement.subscriptionExpiresAt = newExpiry;
      }
      await entitlement.save();

      const synced = await syncUserProFromEntitlementExpiry(
        entitlement,
        newExpiry
      );
      if (synced) {
        usersSynced.push(synced);
      }
    }

    const updated = await Entitlement.find({ orderNumber });

    return res.status(200).json({
      message: "Entitlements expired for order",
      order_number: orderNumber,
      updated_count: updated.length,
      expiry_date: newExpiry,
      entitlements: updated,
      usersSynced,
    });
  } catch (err) {
    console.error("expireEntitlements error:", err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/v1/entitlements/match
 * Amazon Klaviyo: real email + last 7 digits of order ID
 */
exports.matchEntitlements = async (req, res) => {
  try {
    const { order_suffix, customer_email } = req.body;

    if (!order_suffix || !customer_email) {
      return res.status(400).json({
        error: "order_suffix and customer_email are required",
      });
    }

    const suffix = String(order_suffix).trim();
    if (!/^\d{7}$/.test(suffix)) {
      return res.status(400).json({
        error: "order_suffix must be exactly 7 digits",
      });
    }

    const realEmail = normalizeEmail(customer_email);
    if (!realEmail || !realEmail.includes("@")) {
      return res.status(400).json({ error: "Invalid customer_email" });
    }

    const matches = await Entitlement.find({
      platform: "amazon",
      redeemed: false,
      orderNumber: { $regex: `${escapeRegex(suffix)}$` },
      assignedTo: { $regex: /^amazon_pending_/i },
    });

    if (matches.length === 0) {
      return res.status(404).json({
        error: "No pending Amazon entitlements match this order suffix",
        order_suffix: suffix,
      });
    }

    if (matches.length > 1) {
      return res.status(409).json({
        error: "Multiple entitlements match this order suffix — manual review required",
        order_suffix: suffix,
        match_count: matches.length,
        entitlement_ids: matches.map((e) => e.entitlementId),
      });
    }

    const entitlement = matches[0];
    entitlement.customerEmail = realEmail;
    entitlement.assignedTo = realEmail;
    if (!entitlement.customerName) {
      entitlement.customerName = realEmail.split("@")[0];
    }
    await entitlement.save();

    const redeemResult = await autoRedeemEntitlementIfUserExists(entitlement);
    const updated = await Entitlement.findById(entitlement._id);

    return res.status(200).json({
      message: "Entitlement matched and updated",
      order_suffix: suffix,
      order_number: updated.orderNumber,
      customer_email: realEmail,
      entitlement: updated,
      userUpgraded: !!redeemResult.userUpgraded,
      userAlreadyPro: !!redeemResult.userAlreadyPro,
      userId: redeemResult.user?._id || null,
    });
  } catch (err) {
    console.error("matchEntitlements error:", err);
    return res.status(500).json({ error: err.message });
  }
};
