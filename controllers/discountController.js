const Discount = require("../models/Discount");

// Create a new discount
exports.createDiscount = async (req, res) => {
  try {
    const {
      name,
      description,
      discountType,
      discountValue,
      applicablePlans,
      startDate,
      endDate,
      isActive,
      usageLimit
    } = req.body;
    
    if (!name || !description || !discountType || !discountValue || !startDate || !endDate) {
      return res.status(400).json({ 
        message: "name, description, discountType, discountValue, startDate, and endDate are required" 
      });
    }
    
    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      return res.status(400).json({ 
        message: "endDate must be after startDate" 
      });
    }
    
    // Validate discount value
    if (discountType === 'percentage' && discountValue > 100) {
      return res.status(400).json({ 
        message: "Percentage discount cannot exceed 100%" 
      });
    }
    
    const newDiscount = new Discount({
      name,
      description,
      discountType,
      discountValue,
      applicablePlans: applicablePlans || ['all'],
      startDate: start,
      endDate: end,
      isActive,
      usageLimit
    });
    
    // Save the discount (this will trigger the pre-save middleware)
    await newDiscount.save();
    
    // Verify the coupon code was generated
    if (!newDiscount.couponCode) {
      throw new Error('Failed to generate coupon code');
    }
    
    res.status(201).json({
      message: "Discount created successfully",
      discount: newDiscount
    });
    
  } catch (error) {
    console.error('Error creating discount:', error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Get all discounts
exports.getAllDiscounts = async (req, res) => {
  try {
    const discounts = await Discount.find().sort({ createdAt: -1 });
    
    res.status(200).json({
      message: "Discounts retrieved successfully",
      discounts
    });
    
  } catch (error) {
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Get active discounts
exports.getActiveDiscounts = async (req, res) => {
  try {
    const { planType } = req.query;
    
    // Get today's date at start of day for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let query = {
      isActive: true,
      startDate: { $lte: today },
      endDate: { $gte: today }
    };
    
    if (planType && planType !== 'all') {
      query.$or = [
        { applicablePlans: 'all' },
        { applicablePlans: planType }
      ];
    }
    
    const discounts = await Discount.find(query).sort({ discountValue: -1 });
    
    res.status(200).json({
      message: "Active discounts retrieved successfully",
      discounts
    });
    
  } catch (error) {
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Get discount by ID
exports.getDiscountById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const discount = await Discount.findById(id);
    
    if (!discount) {
      return res.status(404).json({ 
        message: "Discount not found" 
      });
    }
    
    res.status(200).json({
      message: "Discount retrieved successfully",
      discount
    });
    
  } catch (error) {
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Update discount
exports.updateDiscount = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const discount = await Discount.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );
    
    if (!discount) {
      return res.status(404).json({ 
        message: "Discount not found" 
      });
    }
    
    res.status(200).json({
      message: "Discount updated successfully",
      discount
    });
    
  } catch (error) {
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Delete discount
exports.deleteDiscount = async (req, res) => {
  try {
    const { id } = req.params;
    
    const discount = await Discount.findByIdAndDelete(id);
    
    if (!discount) {
      return res.status(404).json({ 
        message: "Discount not found" 
      });
    }
    
    res.status(200).json({
      message: "Discount deleted successfully",
      discount
    });
    
  } catch (error) {
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Apply discount to price
exports.applyDiscount = async (req, res) => {
  try {
    const { discountId, basePrice, planType } = req.body;
    
    if (!discountId || !basePrice) {
      return res.status(400).json({ 
        message: "discountId and basePrice are required" 
      });
    }
    
    const discount = await Discount.findById(discountId);
    
    if (!discount) {
      return res.status(404).json({ 
        message: "Discount not found" 
      });
    }
    
    // Check if discount is valid
    if (!discount.isValid()) {
      return res.status(400).json({ 
        message: "Discount is not valid or has expired" 
      });
    }
    
    // Check if discount applies to this plan
    if (!discount.applicablePlans.includes('all') && 
        !discount.applicablePlans.includes(planType)) {
      return res.status(400).json({ 
        message: "Discount does not apply to this plan type" 
      });
    }
    
    // Apply discount
    const finalPrice = discount.applyToPrice(basePrice);
    
    res.status(200).json({
      message: "Discount applied successfully",
      originalPrice: basePrice,
      finalPrice,
      savings: basePrice - finalPrice,
      discount: {
        name: discount.name,
        description: discount.description,
        discountType: discount.discountType,
        discountValue: discount.discountValue
      }
    });
    
  } catch (error) {
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};
