const mongoose = require("mongoose");

const SubscriptionSchema = new mongoose.Schema({
    // User reference
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    // Stripe subscription data
    stripeSubscriptionId: { type: String, required: true, unique: true },
    stripeCustomerId: { type: String, required: true },
    stripePriceId: { type: String, required: true },
    
    // Subscription status and billing
    status: { 
        type: String, 
        enum: ['active', 'canceled', 'past_due', 'unpaid', 'incomplete', 'trialing'],
        required: true 
    },
    currentPeriodStart: { type: Date, required: false },
    currentPeriodEnd: { type: Date, required: false },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    canceledAt: { type: Date },
    
    // Trial information
    trialStart: { type: Date },
    trialEnd: { type: Date },
    
    // Legacy fields for backward compatibility
    customer: { type: String }, // Stripe customer ID (legacy)
    name: { type: String }, // Customer name (legacy)
    plan: { type: String, enum: ['monthly', 'annual', 'daily'] }, // Legacy plan type
    startDate: { type: Date, default: Date.now }, // Legacy start date
    endDate: { type: Date }, // Legacy end date
    
    // Additional Stripe metadata
    stripeMetadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    
    // Billing and payment info
    latestInvoiceId: { type: String },
    defaultPaymentMethodId: { type: String },
    
    // Subscription management
    billingCycleAnchor: { type: Date },
    prorationBehavior: { 
        type: String, 
        enum: ['create_prorations', 'none', 'always_invoice'],
        default: 'create_prorations'
    }
}, {
    timestamps: true
});

// Indexes for better performance
SubscriptionSchema.index({ userId: 1 });
SubscriptionSchema.index({ stripeSubscriptionId: 1 });
SubscriptionSchema.index({ stripeCustomerId: 1 });
SubscriptionSchema.index({ status: 1 });
SubscriptionSchema.index({ currentPeriodEnd: 1 });

// Virtual for checking if subscription is active
SubscriptionSchema.virtual('isActive').get(function() {
    return this.status === 'active';
});

// Virtual for checking if subscription is in trial
SubscriptionSchema.virtual('isInTrial').get(function() {
    if (!this.trialStart || !this.trialEnd) return false;
    const now = new Date();
    return now >= this.trialStart && now <= this.trialEnd;
});

// Method to check if subscription is expired
SubscriptionSchema.methods.isExpired = function() {
    if (!this.currentPeriodEnd) return false; // Can't be expired if no end date
    const now = new Date();
    return this.currentPeriodEnd < now;
};

// Method to get days until renewal
SubscriptionSchema.methods.getDaysUntilRenewal = function() {
    if (!this.currentPeriodEnd) return null; // Can't calculate if no end date
    const now = new Date();
    const diffTime = this.currentPeriodEnd - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

module.exports = mongoose.model('Subscription', SubscriptionSchema);