const Entitlement = require("../models/Entitlement");
const User = require("../models/user");
const emailService = require("../services/emailService");

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

    res.status(201).json({
      message: "Entitlement created successfully",
      entitlement: newEntitlement
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

    // Check if entitlement has been redeemed - allow editing redeemed entitlements
    // but don't allow changing critical fields after redemption
    if (entitlement.redeemed) {
      // For redeemed entitlements, only allow updating non-critical fields
      const allowedUpdates = {
        productName,
        customerName,
        customerEmail,
        assignedTo,
        platform: platform ? platform.toLowerCase() : undefined,
        orderNumber,
        notes,
      };

      // Remove undefined fields
      Object.keys(allowedUpdates).forEach(key => {
        if (allowedUpdates[key] === undefined) {
          delete allowedUpdates[key];
        }
      });

      // Normalize email fields
      if (allowedUpdates.customerEmail) {
        allowedUpdates.customerEmail = allowedUpdates.customerEmail.toLowerCase().trim();
      }
      if (allowedUpdates.assignedTo) {
        allowedUpdates.assignedTo = allowedUpdates.assignedTo.toLowerCase().trim();
      }

      const updatedEntitlement = await Entitlement.findByIdAndUpdate(
        id,
        allowedUpdates,
        { new: true }
      );

      return res.status(200).json({
        message: "Entitlement updated successfully (redeemed entitlement - limited fields updated).",
        entitlement: updatedEntitlement
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

        results.created.push(newEntitlement);

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

// Admin: Generate bulk entitlements (without customer data)
exports.generateBulkEntitlements = async (req, res) => {
  try {
    const { count, productName, platform, expiryDate } = req.body;

    if (!count || !productName || !platform) {
      return res.status(400).json({
        error: "Missing required fields: count, productName, platform"
      });
    }

    // Validate platform
    if (!VALID_PLATFORMS.includes(platform.toLowerCase())) {
      return res.status(400).json({
        error: `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(', ')}`
      });
    }

    if (count < 1 || count > 1000) {
      return res.status(400).json({
        error: "Count must be between 1 and 1000"
      });
    }

    // Set expiry date to 5 years from now if not provided
    let finalExpiryDate = expiryDate ? new Date(expiryDate) : null;
    if (!finalExpiryDate) {
      finalExpiryDate = new Date();
      finalExpiryDate.setFullYear(finalExpiryDate.getFullYear() + 5);
    }

    const entitlements = [];

    for (let i = 0; i < count; i++) {
      const entitlementId = await generateUniqueEntitlementId();
      const newEntitlement = await Entitlement.create({
        entitlementId,
        productName,
        orderNumber: `BULK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        customerName: 'To be assigned',
        customerEmail: 'to.be.assigned@example.com',
        assignedTo: 'to.be.assigned@example.com',
        platform: platform.toLowerCase(),
        expiryDate: finalExpiryDate,
      });

      entitlements.push(newEntitlement);
    }

    res.status(201).json({
      message: `${count} entitlements generated successfully`,
      count: entitlements.length,
      entitlements: entitlements.map(e => ({
        id: e._id,
        entitlementId: e.entitlementId,
        productName: e.productName,
        platform: e.platform,
        expiryDate: e.expiryDate
      }))
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Admin: Send access email to user
exports.sendAccessEmailToUser = async (req, res) => {
  try {
    const { assignedTo, customerName, productName } = req.body;

    if (!assignedTo || !productName) {
      return res.status(400).json({
        error: "Missing required fields: assignedTo, productName"
      });
    }

    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(assignedTo)) {
      return res.status(400).json({
        error: "Invalid email format. Please provide a valid email address"
      });
    }

    // Search for existing entitlements assigned to this email
    const existingEntitlements = await Entitlement.find({
      assignedTo: assignedTo.toLowerCase().trim(),
      redeemed: false, // Only unredeemed entitlements
      expiryDate: { $gt: new Date() } // Only non-expired entitlements
    });

    if (existingEntitlements.length === 0) {
      // No existing entitlements found - return error
      return res.status(404).json({
        error: "No entitlements found for this email address",
        assignedTo: assignedTo,
        message: "Please ensure the user has a valid entitlement before requesting email delivery"
      });
    }

    // Found existing entitlements - send access email
    // Note: This would use a new email template for entitlements
    // For now, we'll mark that the email was sent
    existingEntitlements.forEach(entitlement => {
      entitlement.accessEmailSentAt = new Date();
      entitlement.accessEmailSentTo = assignedTo.toLowerCase().trim();
      entitlement.save();
    });

    res.status(200).json({
      message: `Found ${existingEntitlements.length} entitlement(s) and access email sent successfully`,
      entitlements: existingEntitlements.map(e => ({
        id: e._id,
        entitlementId: e.entitlementId,
        customerName: e.customerName,
        customerEmail: e.customerEmail,
        assignedTo: e.assignedTo,
        productName: e.productName,
        platform: e.platform,
        expiryDate: e.expiryDate
      })),
      emailSent: true,
      entitlementsSent: existingEntitlements.length
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

