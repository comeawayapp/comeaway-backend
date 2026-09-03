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

function optionalEmail(value) {
  if (value == null || value === "") return null;
  const normalized = normalizeEmail(value);
  return normalized || null;
}

/**
 * POST /api/v1/entitlements/sync
 *
 * Shopify: customer_email required; assigned_to defaults to buyer email.
 * Amazon: customer_email / assigned_to may be omitted → stored as null.
 * Idempotent by (platform, orderNumber, syncUnitIndex 1..quantity).
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

    if (!order_number || !platform || !product_name) {
      return res.status(400).json({
        error:
          "Missing required fields: order_number, platform, product_name",
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
    const isAmazon = normalizedPlatform === "amazon";

    let customerEmail = optionalEmail(customer_email);
    let assignedTo = optionalEmail(assigned_to);

    if (!isAmazon) {
      if (!customerEmail) {
        return res.status(400).json({
          error:
            "customer_email is required for non-Amazon platforms (e.g. shopify)",
        });
      }
      assignedTo = assignedTo || customerEmail;
    } else {
      // Amazon: leave null unless a real email was explicitly provided
      if (isAmazonPendingEmail(customerEmail)) customerEmail = null;
      if (isAmazonPendingEmail(assignedTo)) assignedTo = null;
    }

    const finalExpiry = defaultExpiryDate(expiry_date);
    let createdCount = 0;

    for (let unitIndex = 1; unitIndex <= qty; unitIndex++) {
      const existingUnit = await Entitlement.findOne({
        platform: normalizedPlatform,
        orderNumber,
        syncUnitIndex: unitIndex,
      });

      if (existingUnit) {
        continue;
      }

      try {
        const entitlementId = await generateUniqueEntitlementId();
        const row = await Entitlement.create({
          entitlementId,
          productName: product_name,
          orderNumber,
          customerName: customer_name || undefined,
          customerEmail,
          assignedTo,
          platform: normalizedPlatform,
          syncUnitIndex: unitIndex,
          expiryDate: finalExpiry,
          notes: notes || undefined,
          redeemed: false,
        });

        // Auto-redeem only when a real email is present (Shopify / rare Amazon with email)
        if (!isAmazonPendingEmail(assignedTo)) {
          await autoRedeemEntitlementIfUserExists(row);
        }

        createdCount += 1;
      } catch (err) {
        // Concurrent retry hit unique (platform, orderNumber, syncUnitIndex)
        if (err && err.code === 11000) {
          continue;
        }
        throw err;
      }
    }

    const allForOrder = await Entitlement.find({
      platform: normalizedPlatform,
      orderNumber,
    }).sort({ syncUnitIndex: 1, createdAt: 1 });

    const status = createdCount > 0 ? 201 : 200;
    return res.status(status).json({
      message:
        createdCount > 0
          ? `Created ${createdCount} entitlement(s)`
          : "Order already synced (idempotent)",
      order_number: orderNumber,
      created: createdCount,
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
 * Sets expiry_date on all rows for order_number.
 * Omitting expiry_date uses the server's current UTC instant.
 * Redeemed users are synced internally; integration does not send PRO fields.
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
      expiry_date: newExpiry.toISOString(),
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
 * Amazon Klaviyo: real email + last 7 digits of order ID.
 * Updates ALL pending unredeemed rows for the one matching order.
 * Does NOT redeem or set PRO — signup/login handles that.
 * 409 only when the suffix matches multiple distinct order numbers.
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

    // Pending = null/empty assignedTo OR legacy AMAZON_PENDING_... placeholder
    const matches = await Entitlement.find({
      platform: "amazon",
      redeemed: false,
      orderNumber: { $regex: `${escapeRegex(suffix)}$` },
      $or: [
        { assignedTo: null },
        { assignedTo: { $exists: false } },
        { assignedTo: "" },
        { assignedTo: { $regex: /^amazon_pending_/i } },
      ],
    });

    if (matches.length === 0) {
      return res.status(404).json({
        error: "No pending Amazon entitlements match this order suffix",
        order_suffix: suffix,
      });
    }

    const distinctOrders = [
      ...new Set(matches.map((m) => m.orderNumber)),
    ];

    // Genuine ambiguity: same 7 digits on different full Amazon order IDs
    if (distinctOrders.length > 1) {
      return res.status(409).json({
        error:
          "Ambiguous order suffix — matches multiple distinct Amazon orders",
        order_suffix: suffix,
        order_numbers: distinctOrders,
        match_count: matches.length,
      });
    }

    const orderNumber = distinctOrders[0];
    const orderRows = matches.filter((m) => m.orderNumber === orderNumber);

    for (const entitlement of orderRows) {
      entitlement.customerEmail = realEmail;
      entitlement.assignedTo = realEmail;
      if (!entitlement.customerName) {
        entitlement.customerName = realEmail.split("@")[0];
      }
      await entitlement.save();
      // Intentionally do NOT call autoRedeem — account signup/login redeems
    }

    const updated = await Entitlement.find({
      platform: "amazon",
      orderNumber,
    }).sort({ syncUnitIndex: 1, createdAt: 1 });

    return res.status(200).json({
      message: "Entitlements matched and updated",
      order_suffix: suffix,
      order_number: orderNumber,
      customer_email: realEmail,
      updated_count: orderRows.length,
      entitlements: updated,
    });
  } catch (err) {
    console.error("matchEntitlements error:", err);
    return res.status(500).json({ error: err.message });
  }
};
