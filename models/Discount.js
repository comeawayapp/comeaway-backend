const mongoose = require("mongoose");

const DiscountSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true
    },
    description: {
      type: String,
      required: true
    },
    discountType: {
      type: String,
      required: true,
      enum: ['percentage', 'fixed'],
      default: 'percentage'
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0
    },
    // For percentage: 20 means 20% off
    // For fixed: 5 means $5 off
    applicablePlans: [{
      type: String,
      enum: ['monthly', 'annual', 'daily', 'all'],
      default: 'all'
    }],
    startDate: {
      type: Date,
      required: true,
      get: function(date) {
        if (!date) return date;
        // Return date in YYYY-MM-DD format
        return date.toISOString().split('T')[0];
      },
      set: function(date) {
        if (!date) return date;
        // If it's already a Date object, set it to start of day
        if (date instanceof Date) {
          return new Date(date.getFullYear(), date.getMonth(), date.getDate());
        }
        // If it's a string, parse it and set to start of day
        const parsedDate = new Date(date);
        return new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
      }
    },
    endDate: {
      type: Date,
      required: true,
      get: function(date) {
        if (!date) return date;
        // Return date in YYYY-MM-DD format
        return date.toISOString().split('T')[0];
      },
      set: function(date) {
        if (!date) return date;
        // If it's already a Date object, set it to start of day
        if (date instanceof Date) {
          return new Date(date.getFullYear(), date.getMonth(), date.getDate());
        }
        // If it's a string, parse it and set to start of day
        const parsedDate = new Date(date);
        return new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
      }
    },
    isActive: {
      type: Boolean,
      default: true
    },
    usageLimit: {
      type: Number,
      default: null // null means unlimited
    },
    usedCount: {
      type: Number,
      default: 0
    },
    couponCode: {
      type: String,
      unique: true,
      sparse: true
    }
  },
  { 
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true }
  }
);

// Function to generate a unique coupon code
function generateCouponCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Pre-save middleware to auto-generate coupon code
DiscountSchema.pre('save', function(next) {
  try {
    // Always generate a coupon code if one doesn't exist
    if (!this.couponCode || this.couponCode.trim() === '') {
      let isUnique = false;
      let attempts = 0;
      const maxAttempts = 20; // Increased attempts
      
      while (!isUnique && attempts < maxAttempts) {
        const generatedCode = generateCouponCode();
        
        // For now, we'll generate synchronously and handle uniqueness in post-save
        this.couponCode = generatedCode;
        isUnique = true;
        console.log(`Generated coupon code: ${generatedCode}`);
        break; // Exit the loop for now
      }
      
      if (!isUnique) {
        return next(new Error(`Failed to generate coupon code after ${maxAttempts} attempts`));
      }
    }
    next();
  } catch (error) {
    console.error('Error in pre-save middleware:', error);
    next(error);
  }
});

// Post-save middleware to ensure uniqueness
DiscountSchema.post('save', async function(doc, next) {
  try {
    // Check if the generated code is unique
    if (doc.couponCode) {
      const existingDiscount = await doc.constructor.findOne({ 
        couponCode: doc.couponCode,
        _id: { $ne: doc._id } // Exclude current document
      });
      
      if (existingDiscount) {
        console.log(`Duplicate coupon code found: ${doc.couponCode}, regenerating...`);
        // Regenerate the code
        await doc.ensureCouponCode();
        await doc.save();
      }
    }
    next();
  } catch (error) {
    console.error('Error in post-save middleware:', error);
    next(error);
  }
});

// Method to check if discount is valid
DiscountSchema.methods.isValid = function() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  return (
    this.isActive &&
    this.startDate <= today &&
    this.endDate >= today &&
    (this.usageLimit === null || this.usedCount < this.usageLimit)
  );
};

// Method to apply discount to a price
DiscountSchema.methods.applyToPrice = function(basePrice) {
  if (!this.isValid()) {
    return basePrice;
  }

  let discountedPrice;
  
  if (this.discountType === 'percentage') {
    discountedPrice = basePrice * (1 - this.discountValue / 100);
  } else {
    discountedPrice = basePrice - this.discountValue;
  }

  // Ensure price doesn't go below 0
  return Math.max(0, discountedPrice);
};

// Method to increment usage count
DiscountSchema.methods.incrementUsage = function() {
  if (this.usageLimit && this.usedCount >= this.usageLimit) {
    throw new Error('Usage limit exceeded');
  }
  this.usedCount += 1;
  return this.save();
};

// Method to ensure coupon code exists (fallback)
DiscountSchema.methods.ensureCouponCode = async function() {
  if (!this.couponCode || this.couponCode.trim() === '') {
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 20;
    
    while (!isUnique && attempts < maxAttempts) {
      const generatedCode = generateCouponCode();
      const existingDiscount = await this.constructor.findOne({ couponCode: generatedCode });
      
      if (!existingDiscount) {
        this.couponCode = generatedCode;
        isUnique = true;
        console.log(`Fallback: Generated unique coupon code: ${generatedCode}`);
      }
      attempts++;
    }
    
    if (!isUnique) {
      throw new Error(`Failed to generate unique coupon code after ${maxAttempts} attempts`);
    }
  }
  return this;
};

module.exports = mongoose.model("Discount", DiscountSchema);
