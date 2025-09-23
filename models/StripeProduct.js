const mongoose = require("mongoose");

const StripeProductSchema = new mongoose.Schema(
  {
    // Stripe integration
    stripeProductId: {
      type: String,
      required: true,
      unique: true
    },
    
    // Product information
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: ''
    },
    type: {
      type: String,
      enum: ['service', 'good'],
      default: 'service'
    },
    
    // Product status
    isActive: {
      type: Boolean,
      default: true
    },
    
    // Product metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    
    // Product features and benefits
    features: [{
      name: { type: String, required: true },
      description: { type: String },
      included: { type: Boolean, default: true },
      category: { 
        type: String, 
        enum: ['core', 'premium', 'addon'],
        default: 'core'
      }
    }],
    
    // Product categories and tags
    categories: [{
      type: String
    }],
    tags: [{
      type: String
    }],
    
    // Product configuration
    statementDescriptor: {
      type: String,
      maxlength: 22 // Stripe limit
    },
    unitLabel: {
      type: String,
      maxlength: 12 // Stripe limit
    },
    
    // Images and media
    images: [{
      type: String // URLs to product images
    }],
    
    // Product availability
    availableOn: {
      type: Date,
      default: Date.now
    },
    availableUntil: {
      type: Date,
      default: null
    },
    
    // Legacy mapping
    legacyPlanType: {
      type: String,
      enum: ['monthly', 'annual', 'daily'],
      unique: true,
      sparse: true
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better performance
StripeProductSchema.index({ stripeProductId: 1 });
StripeProductSchema.index({ isActive: 1 });
StripeProductSchema.index({ legacyPlanType: 1 });
StripeProductSchema.index({ categories: 1 });
StripeProductSchema.index({ tags: 1 });

// Virtual to check if product is available
StripeProductSchema.virtual('isAvailable').get(function() {
  const now = new Date();
  const availableOn = this.availableOn || new Date(0);
  const availableUntil = this.availableUntil || new Date('2099-12-31');
  
  return this.isActive && now >= availableOn && now <= availableUntil;
});

// Method to get active features
StripeProductSchema.methods.getActiveFeatures = function() {
  return this.features.filter(feature => feature.included);
};

// Method to get features by category
StripeProductSchema.methods.getFeaturesByCategory = function(category) {
  return this.features.filter(feature => 
    feature.included && feature.category === category
  );
};

// Method to check if product has feature
StripeProductSchema.methods.hasFeature = function(featureName) {
  return this.features.some(feature => 
    feature.name === featureName && feature.included
  );
};

// Static method to find products by category
StripeProductSchema.statics.findByCategory = function(category) {
  return this.find({ 
    isActive: true,
    categories: category 
  });
};

// Static method to find products by tag
StripeProductSchema.statics.findByTag = function(tag) {
  return this.find({ 
    isActive: true,
    tags: tag 
  });
};

module.exports = mongoose.model("StripeProduct", StripeProductSchema);
