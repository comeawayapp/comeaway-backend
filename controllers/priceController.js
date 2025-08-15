const Price = require("../models/Price");
const Discount = require("../models/Discount");

// Create a new price
exports.createPrice = async (req, res) => {
  try {
    const { planType, basePrice, currency, description, features } = req.body;
    
    if (!planType || !basePrice) {
      return res.status(400).json({ 
        message: "planType and basePrice are required" 
      });
    }
    
    // Check if price already exists for this plan
    const existingPrice = await Price.findOne({ planType });
    if (existingPrice) {
      return res.status(400).json({ 
        message: `Price already exists for ${planType} plan` 
      });
    }
    
    const newPrice = new Price({
      planType,
      basePrice,
      currency: currency || 'USD',
      description,
      features: features || []
    });
    
    await newPrice.save();
    
    res.status(201).json({
      message: "Price created successfully",
      price: newPrice
    });
    
  } catch (error) {
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Get all prices
exports.getAllPrices = async (req, res) => {
  try {
    const prices = await Price.find({ isActive: true });
    
    res.status(200).json({
      message: "Prices retrieved successfully",
      prices
    });
    
  } catch (error) {
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Get price by plan type
exports.getPriceByPlan = async (req, res) => {
  try {
    const { planType } = req.params;
    
    const price = await Price.findOne({ 
      planType, 
      isActive: true 
    });
    
    if (!price) {
      return res.status(404).json({ 
        message: `Price not found for ${planType} plan` 
      });
    }
    
    res.status(200).json({
      message: "Price retrieved successfully",
      price
    });
    
  } catch (error) {
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Update price
exports.updatePrice = async (req, res) => {
  try {
    const { planType } = req.params;
    const updates = req.body;
    
    const price = await Price.findOneAndUpdate(
      { planType },
      updates,
      { new: true, runValidators: true }
    );
    
    if (!price) {
      return res.status(404).json({ 
        message: `Price not found for ${planType} plan` 
      });
    }
    
    res.status(200).json({
      message: "Price updated successfully",
      price
    });
    
  } catch (error) {
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Get price with available discounts (no automatic application)
exports.getPriceWithAvailableDiscounts = async (req, res) => {
  try {
    const { planType } = req.params;
    
    const price = await Price.findOne({ 
      planType, 
      isActive: true 
    });
    
    if (!price) {
      return res.status(404).json({ 
        message: `Price not found for ${planType} plan` 
      });
    }
    
    // Import the PriceDiscountAssignment model
    const PriceDiscountAssignment = require("../models/PriceDiscountAssignment");
    
    // Find only the discounts that have been specifically assigned to this price
    const assignments = await PriceDiscountAssignment.find({
      priceId: price._id,
      isActive: true
    }).populate({
      path: 'discountId',
      match: {
        isActive: true,
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() }
      }
    });
    
    // Filter out assignments where the discount is no longer valid
    const validAssignments = assignments.filter(assignment => assignment.discountId);
    
    // Map to the expected format
    const availableDiscounts = validAssignments.map(assignment => ({
      id: assignment.discountId._id,
      name: assignment.discountId.name,
      description: assignment.discountId.description,
      discountType: assignment.discountId.discountType,
      discountValue: assignment.discountId.discountValue,
      couponCode: assignment.discountId.couponCode,
      expiresAt: assignment.discountId.endDate
    }));
    
    res.status(200).json({
      message: "Price with available discounts retrieved successfully",
      price: {
        ...price.toObject(),
        availableDiscounts
      }
    });
    
  } catch (error) {
    console.error('Error getting price with available discounts:', error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Apply discount to price manually (using coupon code)
exports.applyDiscountToPrice = async (req, res) => {
  try {
    const { planType, couponCode } = req.body;
    
    if (!planType || !couponCode) {
      return res.status(400).json({ 
        message: "planType and couponCode are required" 
      });
    }
    
    // Find the price for the plan
    const price = await Price.findOne({ 
      planType, 
      isActive: true 
    });
    
    if (!price) {
      return res.status(404).json({ 
        message: `Price not found for ${planType} plan` 
      });
    }
    
    // Find the discount by coupon code
    const discount = await Discount.findOne({
      couponCode: couponCode.toUpperCase(),
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    });
    
    if (!discount) {
      return res.status(404).json({ 
        message: "Invalid or expired coupon code" 
      });
    }
    
    // Check if discount applies to this plan
    if (!discount.applicablePlans.includes('all') && 
        !discount.applicablePlans.includes(planType)) {
      return res.status(400).json({ 
        message: "This coupon code does not apply to the selected plan" 
      });
    }
    
    // Check usage limits
    if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
      return res.status(400).json({ 
        message: "This coupon code has reached its usage limit" 
      });
    }
    
    // Calculate discounted price
    let finalPrice = price.basePrice;
    let savings = 0;
    
    if (discount.discountType === 'percentage') {
      savings = price.basePrice * (discount.discountValue / 100);
      finalPrice = price.basePrice - savings;
    } else {
      savings = Math.min(discount.discountValue, price.basePrice);
      finalPrice = price.basePrice - savings;
    }
    
    // Ensure price doesn't go below 0
    finalPrice = Math.max(0, finalPrice);
    
    // Increment usage count
    try {
      await discount.incrementUsage();
    } catch (error) {
      return res.status(400).json({ 
        message: "Failed to apply discount - usage limit exceeded" 
      });
    }
    
    res.status(200).json({
      message: "Discount applied successfully",
      originalPrice: price.basePrice,
      finalPrice: Math.round(finalPrice * 100) / 100, // Round to 2 decimal places
      savings: Math.round(savings * 100) / 100,
      discount: {
        name: discount.name,
        description: discount.description,
        discountType: discount.discountType,
        discountValue: discount.discountValue,
        couponCode: discount.couponCode
      },
      planType: price.planType,
      currency: price.currency
    });
    
  } catch (error) {
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};
