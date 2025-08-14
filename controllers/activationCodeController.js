const ActivationCode = require("../models/ActivationCode");
const User = require("../models/user");
const emailService = require("../services/emailService");
const crypto = require("crypto");

// Helper function to generate unique code
async function generateUniqueCode() {
  let code;
  let attempts = 0;
  const maxAttempts = 100;
  
  do {
    // Generate 6-digit numeric code
    code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Check if code exists
    const exists = await ActivationCode.findOne({ code });
    if (!exists) return code;
    
    attempts++;
  } while (attempts < maxAttempts);
  
  throw new Error("Unable to generate unique code");
}

// Admin: Create single activation code
exports.createActivationCode = async (req, res) => {
  try {
    const {
      productName,
      orderNumber,
      customerName,
      customerEmail,
      platform,
      expiresIn,
    } = req.body;
    
    // Validate required fields
    if (!productName || !orderNumber || !customerName || 
        !customerEmail || !platform || !expiresIn) {
      return res.status(400).json({ 
        error: "Missing required fields: productName, orderNumber, customerName, customerEmail, platform, expiresIn" 
      });
    }
    
    // Generate unique activation code automatically
    const code = await generateUniqueCode();
    
    // Create activation code
    const newCode = await ActivationCode.create({
      code,
      productName,
      orderNumber,
      customerName,
      customerEmail,
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
    
    res.status(201).json({
      message: "Activation code created successfully",
      activationCode: newCode
    });
    
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
    
    // Get the logged-in user's details
    const loggedInUser = await User.findById(userId);
    if (!loggedInUser) {
      return res.status(404).json({ error: "User not found." });
    }
    
    const activation = await ActivationCode.findOne({ code });
    if (!activation)
      return res.status(404).json({ error: "Invalid activation code." });
    if (activation.redeemed)
      return res.status(400).json({ error: "Code already redeemed." });
    if (activation.expiresIn < new Date())
      return res.status(400).json({ error: "Activation code expired." });
    
    // Check if the activation code's customer details match the logged-in user
    const loggedInUserFullName = `${loggedInUser.firstname} ${loggedInUser.lastname}`;
    const customerDetailsMatch = 
      activation.customerName === loggedInUserFullName && 
      activation.customerEmail === loggedInUser.email;
    
    // Prepare update data for activation code
    const updateData = {
      redeemed: true,
      redeemedBy: userId,
      redeemedAt: new Date(),
      subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    };
    
    // If customer details don't match, update them with logged-in user's details
    if (!customerDetailsMatch) {
      updateData.customerName = loggedInUserFullName;
      updateData.customerEmail = loggedInUser.email;
    }
    
    // Atomically redeem and update customer details if needed
    const updated = await ActivationCode.findOneAndUpdate(
      { code, redeemed: false },
      updateData,
      { new: true }
    );
    
    if (!updated)
      return res.status(409).json({ error: "Code already redeemed." });
    
    // Update user with Pro status and activation mode
    await User.findByIdAndUpdate(userId, {
      isPro: true,
      proExpiresAt: updated.subscriptionExpiresAt,
      activationMode: "code",
    });
    
    res.status(200).json({
      message: "Subscription activated!",
      expiresAt: updated.subscriptionExpiresAt,
      customerDetailsUpdated: !customerDetailsMatch,
      originalCustomerName: activation.customerName,
      originalCustomerEmail: activation.customerEmail,
      updatedCustomerName: loggedInUserFullName,
      updatedCustomerEmail: loggedInUser.email,
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
    };
    
    for (const codeData of codes) {
      try {
        const {
          productName,
          orderNumber,
          customerName,
          customerEmail,
          platform,
          expiresIn,
        } = codeData;
        
        // Validate required fields
        if (!productName || !orderNumber || !customerName || 
            !customerEmail || !platform || !expiresIn) {
          results.errors.push({
            customerEmail: customerEmail || 'N/A',
            error: "Missing required fields"
          });
          continue;
        }
        
        // Generate unique activation code automatically
        const code = await generateUniqueCode();
        
        // Create activation code
        const newCode = await ActivationCode.create({
          code,
          productName,
          orderNumber,
          customerName,
          customerEmail,
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
          customerEmail: codeData.customerEmail || 'N/A',
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

// Admin: Generate bulk activation codes (without customer data)
exports.generateBulkCodes = async (req, res) => {
  try {
    const { count, productName, platform, expiresIn } = req.body;
    
    if (!count || !productName || !platform || !expiresIn) {
      return res.status(400).json({ 
        error: "Missing required fields: count, productName, platform, expiresIn" 
      });
    }
    
    if (count < 1 || count > 1000) {
      return res.status(400).json({ 
        error: "Count must be between 1 and 1000" 
      });
    }
    
    const activationCodes = [];
    
    for (let i = 0; i < count; i++) {
      const code = await generateUniqueCode();
      const newCode = await ActivationCode.create({
        code,
        productName,
        orderNumber: `BULK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        customerName: 'To be assigned',
        customerEmail: 'to.be.assigned@example.com',
        platform,
        expiresIn: new Date(expiresIn),
      });
      
      activationCodes.push(newCode);
    }
    
    res.status(201).json({
      message: `${count} activation codes generated successfully`,
      count: activationCodes.length,
      codes: activationCodes.map(ac => ({
        id: ac._id,
        code: ac.code,
        productName: ac.productName,
        platform: ac.platform,
        expiresIn: ac.expiresIn
      }))
    });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Admin: Send access code to user email
exports.sendAccessCodeToUser = async (req, res) => {
  try {
    const { customerEmail, customerName, productName, platform, expiresIn } = req.body;
    
    if (!customerEmail || !productName || !platform || !expiresIn) {
      return res.status(400).json({ 
        error: "Missing required fields: customerEmail, productName, platform, expiresIn" 
      });
    }
    
    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(customerEmail)) {
      return res.status(400).json({ 
        error: "Invalid email format. Please provide a valid email address "
      });
    }
    
    // Search for existing activation codes for this email
    const existingCodes = await ActivationCode.find({ 
      customerEmail: customerEmail,
      redeemed: false, // Only unredeemed codes
      productName: productName,
      expiresIn: { $gt: new Date() } // Only non-expired codes
    });
    
    if (existingCodes.length === 0) {
      // No existing codes found - return error
      return res.status(404).json({ 
        error: "No activation codes found for this email address",
        customerEmail: customerEmail,
        message: "Please ensure the user has a valid activation code before requesting email delivery"
      });
    }
    
    // Found existing codes - send ONE email with ALL codes
    const emailResult = await emailService.sendMultipleActivationCodes(
      customerEmail,
      existingCodes[0]?.customerName || customerName || 'User',
      existingCodes,
      productName
    );
    
    if (!emailResult.success) {
      return res.status(500).json({ 
        error: "Failed to send email", 
        details: emailResult.error,
        codesFound: existingCodes.length
      });
    }
    
    res.status(200).json({
      message: `Found ${existingCodes.length} activation code(s) and sent them in one email successfully`,
      existingCodes: existingCodes.map(code => ({
        id: code._id,
        code: code.code,
        customerName: code.customerName,
        customerEmail: code.customerEmail,
        productName: code.productName,
        platform: code.platform,
        expiresIn: code.expiresIn
      })),
      emailSent: true,
      codesSent: existingCodes.length
    });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

