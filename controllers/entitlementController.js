const Entitlement = require("../models/Entitlement");
const User = require("../models/user");
const emailService = require("../services/emailService");
const {
  autoRedeemEntitlementIfUserExists,
} = require("./user/entitlementHelper");

// Valid platform values
const VALID_PLATFORMS = ['shopify', 'amazon', 'google_play', 'apple_iap', 'stripe', 'other'];

// Helper function to generate unique entitlement ID
async function generateUniqueEntitlementId() {
  let entitlementId;
  let attempts = 0;
  const maxAttempts = 100;

  do {
    // Generate 6-character alphanumeric entitlement ID
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    entitlementId = '';
    for (let i = 0; i < 6; i++) {
      entitlementId += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Check if entitlement ID exists
    const exists = await Entitlement.findOne({ entitlementId });
    if (!exists) return entitlementId;

    attempts++;
  } while (attempts < maxAttempts);

  throw new Error("Unable to generate unique entitlement ID");
}

// Admin: Create single entitlement
exports.createEntitlement = async (req, res) => {
  try {
    const {
      productName,
      orderNumber,
      customerName,
      customerEmail,
      assignedTo,
      platform,
      expiryDate,
      notes,
    } = req.body;

    // Validate required fields
    if (!productName || !orderNumber || !customerEmail || !assignedTo || !platform) {
      return res.status(400).json({
        error: "Missing required fields: productName, orderNumber, customerEmail, assignedTo, platform"
      });
    }

    // Validate platform
    if (!VALID_PLATFORMS.includes(platform.toLowerCase())) {
      return res.status(400).json({
        error: `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(', ')}`
      });
    }

    // Generate unique entitlement ID automatically
    const entitlementId = await generateUniqueEntitlementId();

    // Set expiry date to 5 years from now if not provided
    let finalExpiryDate = expiryDate ? new Date(expiryDate) : null;
    if (!finalExpiryDate) {
      finalExpiryDate = new Date();
      finalExpiryDate.setFullYear(finalExpiryDate.getFullYear() + 5);
    }

    // Create entitlement
    const newEntitlement = await Entitlement.create({
      entitlementId,
      productName,
      orderNumber,
      customerName: customerName || undefined,
      customerEmail: customerEmail.toLowerCase().trim(),
      assignedTo: assignedTo.toLowerCase().trim(),
      platform: platform.toLowerCase(),
      expiryDate: finalExpiryDate,
      notes: notes || undefined,
    });

    // If user already exists, redeem immediately and upgrade to PRO
    const { userUpgraded, userAlreadyPro, user, redeemResult } =
      await autoRedeemEntitlementIfUserExists(newEntitlement);

    // Reload entitlement after possible redemption
    const entitlement = await Entitlement.findById(newEntitlement._id);

    res.status(201).json({
      message: userUpgraded
        ? "Entitlement created and user upgraded to PRO"
        : userAlreadyPro
          ? "Entitlement created and linked to existing PRO user"
          : "Entitlement created successfully",
      entitlement,
      userUpgraded: !!userUpgraded,
      userAlreadyPro: !!userAlreadyPro,
      userId: user?._id || null,
      redeemResult: redeemResult || null,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Admin: List/search entitlements
exports.listEntitlements = async (req, res) => {
  try {
    const {
      // Priority search fields (most commonly used)
      entitlementId,   // Search by Entitlement ID
      customerEmail,   // Search by Email
      assignedTo,     // Search by Assigned To
      platform,        // platform: All ▼
      redeemed,        // redeemed: All ▼
      ...otherFilters
    } = req.query;

    // Build filter object
    const filter = { ...otherFilters };

    // Helper function to escape regex special characters
    const escapeRegex = (string) => {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    // Priority search fields (case-insensitive partial match)
    if (entitlementId) {
      filter.entitlementId = { $regex: escapeRegex(entitlementId), $options: 'i' };
    }

    if (customerEmail) {
      filter.customerEmail = { $regex: escapeRegex(customerEmail), $options: 'i' };
    }

    if (assignedTo) {
      filter.assignedTo = { $regex: escapeRegex(assignedTo), $options: 'i' };
    }

    // Platform filter (exact match for dropdown)
    if (platform && platform !== 'All') {
      filter.platform = platform.toLowerCase();
    }

    // Redemption status filter (exact match for dropdown)
    if (redeemed && redeemed !== 'All') {
      filter.redeemed = redeemed === 'true' || redeemed === true;
    }

    const entitlements = await Entitlement.find(filter);
    res.json(entitlements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// User: Redeem entitlement (manual redemption endpoint for backward compatibility)
exports.redeemEntitlement = async (req, res) => {
  try {
    const { entitlementId } = req.body;
    const userId = req.user._id;

    // Get the logged-in user's details
    const loggedInUser = await User.findById(userId);
    if (!loggedInUser) {
      return res.status(404).json({ error: "User not found." });
    }

    const entitlement = await Entitlement.findOne({ entitlementId });
    if (!entitlement)
      return res.status(404).json({ error: "Invalid entitlement." });
    if (entitlement.redeemed)
      return res.status(400).json({ error: "Entitlement already redeemed." });
    if (entitlement.expiryDate < new Date())
      return res.status(400).json({ error: "Entitlement expired." });

    // Check if the entitlement is assigned to this user
    if (entitlement.assignedTo.toLowerCase() !== loggedInUser.email.toLowerCase()) {
      return res.status(403).json({ 
        error: "This entitlement is not assigned to your email address." 
      });
    }

    // Prepare update data for entitlement
    const updateData = {
      redeemed: true,
      redeemedBy: userId,
      redeemedAt: new Date(),
      subscriptionExpiresAt: entitlement.expiryDate || new Date('2030-12-31T23:59:59.999Z'),
    };

    // Atomically redeem entitlement
    const updated = await Entitlement.findOneAndUpdate(
      { entitlementId, redeemed: false },
      updateData,
      { new: true }
    );

    if (!updated)
      return res.status(409).json({ error: "Entitlement already redeemed." });

    // Update user with Pro status and activation mode
    await User.findByIdAndUpdate(userId, {
      isPro: true,
      proExpiresAt: updated.subscriptionExpiresAt,
      activationMode: "code",
    });

    res.status(200).json({
      message: "Subscription activated!",
      expiresAt: updated.subscriptionExpiresAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Admin: Edit entitlement
exports.editEntitlement = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      productName,
      customerName,
      customerEmail,
      assignedTo,
      platform,
      expiryDate,
      orderNumber,
      notes,
    } = req.body;

    const entitlement = await Entitlement.findById(id);
    if (!entitlement) {
      return res.status(404).json({ error: "Entitlement not found." });
    }

    // Validate platform if provided
    if (platform && !VALID_PLATFORMS.includes(platform.toLowerCase())) {
      return res.status(400).json({
        error: `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(', ')}`
      });
    }

    // Redeemed: allow metadata + expiry; sync user PRO from new expiry
    if (entitlement.redeemed) {
      const allowedUpdates = {
        productName,
        customerName,
        customerEmail,
        assignedTo,
        platform: platform ? platform.toLowerCase() : undefined,
        orderNumber,
        notes,
      };

      if (expiryDate !== undefined && expiryDate !== null && expiryDate !== "") {
        const newExpiry = new Date(expiryDate);
        if (isNaN(newExpiry.getTime())) {
          return res.status(400).json({ error: "Invalid expiryDate" });
        }
        allowedUpdates.expiryDate = newExpiry;
        allowedUpdates.subscriptionExpiresAt = newExpiry;
      }

      Object.keys(allowedUpdates).forEach((key) => {
        if (allowedUpdates[key] === undefined) {
          delete allowedUpdates[key];
        }
      });

      if (allowedUpdates.customerEmail) {
        allowedUpdates.customerEmail = allowedUpdates.customerEmail
          .toLowerCase()
          .trim();
      }
      if (allowedUpdates.assignedTo) {
        allowedUpdates.assignedTo = allowedUpdates.assignedTo
          .toLowerCase()
          .trim();
      }

      const updatedEntitlement = await Entitlement.findByIdAndUpdate(
        id,
        allowedUpdates,
        { new: true }
      );

      let userSynced = null;
      if (allowedUpdates.expiryDate && updatedEntitlement.redeemedBy) {
        const redeemedUser = await User.findById(updatedEntitlement.redeemedBy);
        if (redeemedUser) {
          const now = new Date();
          const newExpiry = new Date(allowedUpdates.expiryDate);
          redeemedUser.proExpiresAt = newExpiry;

          if (newExpiry.getTime() > now.getTime()) {
            redeemedUser.isPro = true;
            redeemedUser.activationMode = redeemedUser.activationMode || "code";
          } else {
            redeemedUser.isPro = false;
            redeemedUser.activationMode = null;
          }

          await redeemedUser.save();
          userSynced = {
            userId: redeemedUser._id,
            isPro: redeemedUser.isPro,
            proExpiresAt: redeemedUser.proExpiresAt,
          };
        }
      }

      return res.status(200).json({
        message:
          "Entitlement updated successfully (redeemed entitlement).",
        entitlement: updatedEntitlement,
        userSynced,
      });
    }

    // For unredeemed entitlements, allow updating all fields except entitlementId
    const updateData = {
      productName,
      customerName,
      customerEmail: customerEmail ? customerEmail.toLowerCase().trim() : undefined,
      assignedTo: assignedTo ? assignedTo.toLowerCase().trim() : undefined,
      platform: platform ? platform.toLowerCase() : undefined,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      orderNumber,
      notes,
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const updatedEntitlement = await Entitlement.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    res.status(200).json({
      message: "Entitlement updated successfully.",
      entitlement: updatedEntitlement
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Admin: Delete entitlement
exports.deleteEntitlement = async (req, res) => {
  try {
    const { id } = req.params;

    const entitlement = await Entitlement.findById(id);
    if (!entitlement) {
      return res.status(404).json({ error: "Entitlement not found." });
    }

    // Check if entitlement has been redeemed
    if (entitlement.redeemed) {
      return res.status(400).json({
        error: "Cannot delete redeemed entitlement."
      });
    }

    await Entitlement.findByIdAndDelete(id);

    res.status(200).json({
      message: "Entitlement deleted successfully."
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Admin: Bulk import entitlements
exports.importEntitlements = async (req, res) => {
  try {
    const { entitlements, quantity } = req.body;

    // Support both single entitlement object and array
    let entitlementsArray = Array.isArray(entitlements) ? entitlements : [entitlements];
    
    // If quantity is provided, create N entitlements from the first one
    if (quantity && quantity > 1 && entitlementsArray.length === 1) {
      const baseEntitlement = entitlementsArray[0];
      entitlementsArray = Array(quantity).fill(null).map((_, index) => ({
        ...baseEntitlement,
        // First entitlement goes to buyer, rest are unassigned
        assignedTo: index === 0 ? (baseEntitlement.assignedTo || baseEntitlement.customerEmail) : undefined
      }));
    }

    if (!entitlementsArray || entitlementsArray.length === 0) {
      return res.status(400).json({
        error: "Entitlements must be a non-empty array or object."
      });
    }

    const results = {
      created: [],
      errors: [],
    };

    for (const entitlementData of entitlementsArray) {
      try {
        const {
          productName,
          orderNumber,
          customerName,
          customerEmail,
          assignedTo,
          platform,
          expiryDate,
          notes,
        } = entitlementData;

        // Validate required fields
        if (!productName || !orderNumber || !customerEmail || !platform) {
          results.errors.push({
            customerEmail: customerEmail || 'N/A',
            error: "Missing required fields: productName, orderNumber, customerEmail, platform"
          });
          continue;
        }

        // Validate platform
        if (!VALID_PLATFORMS.includes(platform.toLowerCase())) {
          results.errors.push({
            customerEmail: customerEmail || 'N/A',
            error: `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(', ')}`
          });
          continue;
        }

        // Use assignedTo if provided, otherwise default to customerEmail
        const finalAssignedTo = assignedTo || customerEmail;
        if (!finalAssignedTo) {
          results.errors.push({
            customerEmail: customerEmail || 'N/A',
            error: "assignedTo is required (or must be same as customerEmail)"
          });
          continue;
        }

        // Generate unique entitlement ID automatically
        const entitlementId = await generateUniqueEntitlementId();

        // Set expiry date to 5 years from now if not provided
        let finalExpiryDate = expiryDate ? new Date(expiryDate) : null;
        if (!finalExpiryDate) {
          finalExpiryDate = new Date();
          finalExpiryDate.setFullYear(finalExpiryDate.getFullYear() + 5);
        }

        // Create entitlement
        const newEntitlement = await Entitlement.create({
          entitlementId,
          productName,
          orderNumber,
          customerName: customerName || undefined,
          customerEmail: customerEmail.toLowerCase().trim(),
          assignedTo: finalAssignedTo.toLowerCase().trim(),
          platform: platform.toLowerCase(),
          expiryDate: finalExpiryDate,
          notes: notes || undefined,
        });

        const { userUpgraded, userAlreadyPro, user } =
          await autoRedeemEntitlementIfUserExists(newEntitlement);

        const entitlement = await Entitlement.findById(newEntitlement._id);
        results.created.push({
          entitlement,
          userUpgraded: !!userUpgraded,
          userAlreadyPro: !!userAlreadyPro,
          userId: user?._id || null,
        });

      } catch (error) {
        results.errors.push({
          customerEmail: entitlementData.customerEmail || 'N/A',
          error: error.message
        });
      }
    }

    res.status(200).json({
      message: `Import completed. Created: ${results.created.length}, Errors: ${results.errors.length}`,
      results
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Admin: Send access email to user
exports.sendAccessEmailToUser = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        error: "Missing required fields: id"
      });
    }

    // Search for existing entitlements assigned to this email
    const existingEntitlement = await Entitlement.findById(id);

    if (!existingEntitlement) {
      // No existing entitlements found - return error
      return res.status(404).json({
        error: "No entitlements found for this email address",
        message: "Please ensure the user has a valid entitlement before requesting email delivery"
      });
    }

    // Send access email to the customer
    const customerName = existingEntitlement.customerName || 'User';
    const emailToSend = existingEntitlement.assignedTo || existingEntitlement.customerEmail;
    
    try {
      await emailService.sendEntitlementAccessEmail(
        emailToSend,
        customerName,
        existingEntitlement.entitlementId,
        existingEntitlement.productName,
        existingEntitlement.expiryDate
      );

      // Mark that the email was sent
      existingEntitlement.accessEmailSentAt = new Date();
      existingEntitlement.accessEmailSentTo = emailToSend.toLowerCase().trim();
      await existingEntitlement.save();

      res.status(200).json({
        message: `Access email sent successfully`,
        emailSent: true,
        emailSentTo: emailToSend,
        entitlement: existingEntitlement
      });
    } catch (emailError) {
      console.error("Failed to send access email:", emailError);
      res.status(500).json({
        error: "Failed to send access email",
        details: emailError.message
      });
    }

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

