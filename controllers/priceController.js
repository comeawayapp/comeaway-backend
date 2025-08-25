const Price = require("../models/Price");
const Discount = require("../models/Discount");
// Create a new price
exports.createPrice = async (req, res) => {
  try {
    const { planType, basePrice, currency, description } = req.body;
    
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
      description
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
    
    // const price = await Price.findOne({ 
    //   planType, 
    //   isActive: true 
    // });

    const prices = await Price.find({
      isActive: true
    });

    console.log(prices);
    
    if (!prices.length) {
      return res.status(404).json({ 
        message: `Price not found for ${planType} plan` 
      });
    }
    
    
        // Process each price individually
    let computedPrices = [];
    for (const price of prices) {
      // Check if this specific price has an assigned discount
      let availableDiscounts = [];
      
      if (price.discountId) {
        const discount = await Discount.findById(price.discountId);
        
        if (discount && discount.isActive && 
            new Date() >= new Date(discount.startDate) && 
            new Date() <= new Date(discount.endDate)) {
          
          let discountedPrice = price.basePrice;
          let savings = 0;
          
          // Calculate the discounted price
          if (discount.discountType === 'percentage') {
            savings = price.basePrice * (discount.discountValue / 100);
            discountedPrice = price.basePrice - savings;
          } else {
            savings = Math.min(discount.discountValue, price.basePrice);
            discountedPrice = price.basePrice - savings;
          }
          
          // Ensure price doesn't go below 0
          discountedPrice = Math.max(0, discountedPrice);
          
          availableDiscounts.push({
            id: discount._id,
            name: discount.name,
            description: discount.description,
            discountType: discount.discountType,
            discountValue: discount.discountValue,
            couponCode: discount.couponCode,
            expiresAt: discount.endDate,
            originalPrice: price.basePrice,
            discountedPrice: Math.round(discountedPrice * 100) / 100, // Round to 2 decimal places
            savings: Math.round(savings * 100) / 100
          });
        }
      }
      
      // Add this price with its own availableDiscounts
      computedPrices.push({
        ...price.toObject(),
        availableDiscounts
      });
    }
    
    res.status(200).json({
      message: "Price with available discounts retrieved successfully",
      prices: computedPrices
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

// Simple: Assign discount to price (only one discount per price)
exports.assignDiscount = async (req, res) => {
  try {
    const { priceId, discountId } = req.body;
    
    if (!priceId || !discountId) {
      return res.status(400).json({ 
        message: "priceId and discountId are required" 
      });
    }
    
    // Find the price
    const price = await Price.findById(priceId);
    if (!price) {
      return res.status(404).json({ message: "Price not found" });
    }
    
    // Find the discount
    const discount = await Discount.findById(discountId);
    if (!discount) {
      return res.status(404).json({ message: "Discount not found" });
    }
    
    // Check if discount is active
    if (!discount.isActive) {
      return res.status(400).json({ message: "Discount is not active" });
    }
    
    // Assign the discount (this replaces any existing discount)
    price.discountId = discountId;
    await price.save();
    
    res.status(200).json({
      message: "Discount assigned successfully",
      price: price
    });
    
  } catch (error) {
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Simple: Remove discount from price
exports.removeDiscount = async (req, res) => {
  try {
    const { priceId } = req.params;
    
    const price = await Price.findById(priceId);
    if (!price) {
      return res.status(404).json({ message: "Price not found" });
    }
    
    // Remove the discount
    price.discountId = null;
    await price.save();
    
    res.status(200).json({
      message: "Discount removed successfully",
      price: price
    });
    
  } catch (error) {
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};


