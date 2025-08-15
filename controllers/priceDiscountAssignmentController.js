const PriceDiscountAssignment = require("../models/PriceDiscountAssignment");
const Price = require("../models/Price");
const Discount = require("../models/Discount");

// Assign a discount to a price
exports.assignDiscountToPrice = async (req, res) => {
  try {
    const { priceId, discountId } = req.body;
    
    if (!priceId || !discountId) {
      return res.status(400).json({ 
        message: "priceId and discountId are required" 
      });
    }
    
    // Check if price exists
    const price = await Price.findById(priceId);
    if (!price) {
      return res.status(404).json({ 
        message: "Price not found" 
      });
    }
    
    // Check if discount exists
    const discount = await Discount.findById(discountId);
    if (!discount) {
      return res.status(404).json({ 
        message: "Discount not found" 
      });
    }
    
    // Check if discount is active and valid
    if (!discount.isActive) {
      return res.status(400).json({ 
        message: "Discount is not active" 
      });
    }
    
    // Check if discount applies to this plan type
    if (!discount.applicablePlans.includes('all') && 
        !discount.applicablePlans.includes(price.planType)) {
      return res.status(400).json({ 
        message: "This discount does not apply to the selected plan type" 
      });
    }
    
    // Create or update assignment
    const assignment = await PriceDiscountAssignment.findOneAndUpdate(
      { priceId, discountId },
      { 
        isActive: true,
        assignedAt: new Date(),
        assignedBy: req.user ? req.user._id : undefined
      },
      { 
        upsert: true, 
        new: true,
        runValidators: true 
      }
    );
    
    res.status(200).json({
      message: "Discount assigned to price successfully",
      assignment
    });
    
  } catch (error) {
    console.error('Error assigning discount to price:', error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Remove a discount assignment from a price
exports.removeDiscountFromPrice = async (req, res) => {
  try {
    const { priceId, discountId } = req.params;
    
    const assignment = await PriceDiscountAssignment.findOneAndUpdate(
      { priceId, discountId },
      { isActive: false },
      { new: true }
    );
    
    if (!assignment) {
      return res.status(404).json({ 
        message: "Assignment not found" 
      });
    }
    
    res.status(200).json({
      message: "Discount removed from price successfully",
      assignment
    });
    
  } catch (error) {
    console.error('Error removing discount from price:', error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Get all active assignments for a price
exports.getAssignmentsForPrice = async (req, res) => {
  try {
    const { priceId } = req.params;
    
    const assignments = await PriceDiscountAssignment.find({
      priceId,
      isActive: true
    }).populate('discountId');
    
    res.status(200).json({
      message: "Assignments retrieved successfully",
      assignments
    });
    
  } catch (error) {
    console.error('Error getting assignments for price:', error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Get all active assignments
exports.getAllAssignments = async (req, res) => {
  try {
    const assignments = await PriceDiscountAssignment.find({
      isActive: true
    }).populate('priceId discountId');
    
    res.status(200).json({
      message: "All assignments retrieved successfully",
      assignments
    });
    
  } catch (error) {
    console.error('Error getting all assignments:', error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};
