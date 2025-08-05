const ActivationCode = require("../models/ActivationCode");
const User = require("../models/user");
const emailService = require("../services/emailService");

// Admin: Create activation code
exports.createActivationCode = async (req, res) => {
  try {
    const {
      code,
      productName,
      orderNumber,
      customerName,
      customerEmail,
      phoneNumber,
      platform,
      expiresIn,
    } = req.body;
    if (!/^\d{6}$/.test(code))
      return res.status(400).json({ error: "Code must be 6 digits." });
    const exists = await ActivationCode.findOne({ code });
    if (exists) return res.status(400).json({ error: "Code already exists." });
    const newCode = await ActivationCode.create({
      code,
      productName,
      orderNumber,
      customerName,
      customerEmail,
      phoneNumber,
      platform,
      expiresIn,
    });

    // Send activation code email (non-blocking)
    emailService
      .sendActivationCode(
        customerEmail,
        customerName,
        code,
        productName,
        expiresIn
      )
      .catch((error) => {
        console.error("Failed to send activation code email:", error);
      });

    res.status(201).json(newCode);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Admin: List/search activation codes
exports.listActivationCodes = async (req, res) => {
  try {
    const { 
      // Priority search fields (most commonly used)
      code,           // Search by Code
      customerName,   // Search by Name  
      customerEmail,  // Search by Email
      platform,       // platform: All ▼
      redeemed,       // redeemed: All ▼
      
      // Additional filters
      orderNumber, 
      phoneNumber,
      productName,
      ...otherFilters 
    } = req.query;
    
    // Build filter object
    const filter = { ...otherFilters };
    
         // Helper function to escape regex special characters
     const escapeRegex = (string) => {
       return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
     };
     
     // Priority search fields (case-insensitive partial match)
     if (code) {
       filter.code = { $regex: escapeRegex(code), $options: 'i' };
     }
     
     if (customerName) {
       filter.customerName = { $regex: escapeRegex(customerName), $options: 'i' };
     }
     
     if (customerEmail) {
       filter.customerEmail = { $regex: escapeRegex(customerEmail), $options: 'i' };
     }
     
     // Platform filter (exact match for dropdown)
     if (platform && platform !== 'All') {
       filter.platform = platform;
     }
     
     // Redemption status filter (exact match for dropdown)
     if (redeemed && redeemed !== 'All') {
       filter.redeemed = redeemed === 'true' || redeemed === true;
     }
     
     // Additional search fields (case-insensitive partial match)
     if (orderNumber) {
       filter.orderNumber = { $regex: escapeRegex(orderNumber), $options: 'i' };
     }
     
     if (phoneNumber) {
       filter.phoneNumber = { $regex: escapeRegex(phoneNumber), $options: 'i' };
     }
     
     if (productName) {
       filter.productName = { $regex: escapeRegex(productName), $options: 'i' };
     }
    
    const codes = await ActivationCode.find(filter);
    res.json(codes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// User: Redeem activation code
exports.redeemActivationCode = async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user._id;
    const activation = await ActivationCode.findOne({ code });
    if (!activation)
      return res.status(404).json({ error: "Invalid activation code." });
    if (activation.redeemed)
      return res.status(400).json({ error: "Code already redeemed." });
    if (activation.expiresIn < new Date())
      return res.status(400).json({ error: "Activation code expired." });
    // Atomically redeem
    const updated = await ActivationCode.findOneAndUpdate(
      { code, redeemed: false },
      {
        redeemed: true,
        redeemedBy: userId,
        redeemedAt: new Date(),
        subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      },
      { new: true }
    );
    if (!updated)
      return res.status(409).json({ error: "Code already redeemed." });
    // Update user
    await User.findByIdAndUpdate(userId, {
      isPro: true,
      proExpiresAt: updated.subscriptionExpiresAt,
    });
    res.status(200).json({
      message: "Subscription activated!",
      expiresAt: updated.subscriptionExpiresAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Admin: Edit activation code
exports.editActivationCode = async (req, res) => {
  try {
    const { id } = req.params;
         const {
       productName,
       customerName,
       customerEmail,
       phoneNumber,
       platform,
       expiresIn,
     } = req.body;
    
    const activationCode = await ActivationCode.findById(id);
    if (!activationCode) {
      return res.status(404).json({ error: "Activation code not found." });
    }
    
    // Check if code has been redeemed - allow editing redeemed codes
    // but don't allow changing critical fields after redemption
    if (activationCode.redeemed) {
             // For redeemed codes, only allow updating non-critical fields
       const allowedUpdates = {
         productName,
         customerName,
         customerEmail,
         phoneNumber,
         platform,
       };
      
      // Remove undefined fields
      Object.keys(allowedUpdates).forEach(key => {
        if (allowedUpdates[key] === undefined) {
          delete allowedUpdates[key];
        }
      });
      
      const updatedCode = await ActivationCode.findByIdAndUpdate(
        id,
        allowedUpdates,
        { new: true }
      );
      
      return res.status(200).json({
        message: "Activation code updated successfully (redeemed code - limited fields updated).",
        activationCode: updatedCode
      });
    }
    
         // For unredeemed codes, allow updating all fields except code
     const updateData = {
       productName,
       customerName,
       customerEmail,
       phoneNumber,
       platform,
       expiresIn: expiresIn ? new Date(expiresIn) : undefined,
     };
    
    // Remove undefined fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });
    
    const updatedCode = await ActivationCode.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );
    
    res.status(200).json({
      message: "Activation code updated successfully.",
      activationCode: updatedCode
    });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Admin: Delete activation code
exports.deleteActivationCode = async (req, res) => {
  try {
    const { id } = req.params;
    
    const activationCode = await ActivationCode.findById(id);
    if (!activationCode) {
      return res.status(404).json({ error: "Activation code not found." });
    }
    
    // Check if code has been redeemed
    if (activationCode.redeemed) {
      return res.status(400).json({ 
        error: "Cannot delete redeemed activation code." 
      });
    }
    
    await ActivationCode.findByIdAndDelete(id);
    
    res.status(200).json({ 
      message: "Activation code deleted successfully." 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Admin: Bulk import activation codes
exports.importActivationCodes = async (req, res) => {
  try {
    const { codes } = req.body;
    
    if (!Array.isArray(codes) || codes.length === 0) {
      return res.status(400).json({ 
        error: "Codes must be a non-empty array." 
      });
    }
    
    const results = {
      created: [],
      errors: [],
      duplicates: []
    };
    
    for (const codeData of codes) {
      try {
        const {
          code,
          productName,
          orderNumber,
          customerName,
          customerEmail,
          phoneNumber,
          platform,
          expiresIn,
        } = codeData;
        
        // Validate required fields
        if (!code || !productName || !orderNumber || !customerName || 
            !customerEmail || !phoneNumber || !platform || !expiresIn) {
          results.errors.push({
            code: code || 'N/A',
            error: "Missing required fields"
          });
          continue;
        }
        
        // Validate code format
        if (!/^\d{6}$/.test(code)) {
          results.errors.push({
            code,
            error: "Code must be 6 digits"
          });
          continue;
        }
        
        // Check for duplicates
        const exists = await ActivationCode.findOne({ code });
        if (exists) {
          results.duplicates.push({
            code,
            error: "Code already exists"
          });
          continue;
        }
        
        // Create activation code
        const newCode = await ActivationCode.create({
          code,
          productName,
          orderNumber,
          customerName,
          customerEmail,
          phoneNumber,
          platform,
          expiresIn: new Date(expiresIn),
        });
        
        // Send activation code email (non-blocking)
        emailService
          .sendActivationCode(
            customerEmail,
            customerName,
            code,
            productName,
            new Date(expiresIn)
          )
          .catch((error) => {
            console.error("Failed to send activation code email:", error);
          });
        
        results.created.push(newCode);
        
      } catch (error) {
        results.errors.push({
          code: codeData.code || 'N/A',
          error: error.message
        });
      }
    }
    
    res.status(200).json({
      message: `Import completed. Created: ${results.created.length}, Errors: ${results.errors.length}, Duplicates: ${results.duplicates.length}`,
      results
    });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

