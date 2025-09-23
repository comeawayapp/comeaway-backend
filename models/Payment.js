const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema(
  {
    // User and subscription references
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      default: null
    },
    
    // Stripe integration
    stripePaymentIntentId: {
      type: String,
      unique: true,
      sparse: true
    },
    stripeChargeId: {
      type: String,
      unique: true,
      sparse: true
    },
    stripeInvoiceId: {
      type: String,
      unique: true,
      sparse: true
    },
    
    // Payment details
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      required: true,
      default: 'usd',
      enum: ['usd', 'eur', 'gbp', 'ngn', 'cad']
    },
    status: {
      type: String,
      required: true,
      enum: [
        'requires_payment_method',
        'requires_confirmation',
        'requires_action',
        'processing',
        'requires_capture',
        'canceled',
        'succeeded',
        'failed'
      ],
      default: 'requires_payment_method'
    },
    
    // Payment method information
    paymentMethodType: {
      type: String,
      enum: ['card', 'bank_transfer', 'alipay', 'ideal', 'sepa_debit', 'sofort'],
      default: 'card'
    },
    paymentMethodId: {
      type: String
    },
    
    // Customer information
    customerId: {
      type: String,
      required: true
    },
    customerEmail: {
      type: String
    },
    
    // Payment metadata
    description: {
      type: String,
      default: ''
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    
    // Payment processing
    processingType: {
      type: String,
      enum: ['subscription', 'one_time', 'setup', 'refund'],
      required: true
    },
    
    // Refund information
    refunded: {
      type: Boolean,
      default: false
    },
    refundedAmount: {
      type: Number,
      default: 0
    },
    refundReason: {
      type: String,
      enum: ['duplicate', 'fraudulent', 'requested_by_customer']
    },
    
    // Failure information
    failureCode: {
      type: String
    },
    failureMessage: {
      type: String
    },
    
    // Timestamps
    paidAt: {
      type: Date
    },
    failedAt: {
      type: Date
    },
    refundedAt: {
      type: Date
    },
    
    // Receipt information
    receiptUrl: {
      type: String
    },
    receiptNumber: {
      type: String
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better performance
PaymentSchema.index({ userId: 1 });
PaymentSchema.index({ subscriptionId: 1 });
PaymentSchema.index({ stripePaymentIntentId: 1 });
PaymentSchema.index({ stripeChargeId: 1 });
PaymentSchema.index({ stripeInvoiceId: 1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ processingType: 1 });
PaymentSchema.index({ paidAt: 1 });
PaymentSchema.index({ createdAt: 1 });

// Virtual to get amount in dollars
PaymentSchema.virtual('amountInDollars').get(function() {
  return this.amount / 100;
});

// Virtual to get formatted amount
PaymentSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: this.currency.toUpperCase()
  }).format(this.amountInDollars);
});

// Virtual to check if payment is successful
PaymentSchema.virtual('isSuccessful').get(function() {
  return this.status === 'succeeded';
});

// Virtual to check if payment is failed
PaymentSchema.virtual('isFailed').get(function() {
  return this.status === 'failed' || this.status === 'canceled';
});

// Virtual to check if payment is pending
PaymentSchema.virtual('isPending').get(function() {
  return [
    'requires_payment_method',
    'requires_confirmation',
    'requires_action',
    'processing',
    'requires_capture'
  ].includes(this.status);
});

// Method to check if payment is refundable
PaymentSchema.methods.isRefundable = function() {
  return this.isSuccessful && !this.refunded && this.refundedAmount < this.amount;
};

// Method to get remaining refundable amount
PaymentSchema.methods.getRemainingRefundableAmount = function() {
  if (!this.isRefundable()) return 0;
  return this.amount - this.refundedAmount;
};

// Method to check if payment is for subscription
PaymentSchema.methods.isSubscriptionPayment = function() {
  return this.processingType === 'subscription';
};

// Static method to find payments by user
PaymentSchema.statics.findByUser = function(userId, options = {}) {
  return this.find({ userId, ...options }).sort({ createdAt: -1 });
};

// Static method to find successful payments
PaymentSchema.statics.findSuccessful = function(options = {}) {
  return this.find({ status: 'succeeded', ...options });
};

// Static method to find failed payments
PaymentSchema.statics.findFailed = function(options = {}) {
  return this.find({ 
    status: { $in: ['failed', 'canceled'] }, 
    ...options 
  });
};

// Static method to get payment statistics
PaymentSchema.statics.getPaymentStats = async function(options = {}) {
  const pipeline = [
    { $match: options },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' },
        totalCount: { $sum: 1 },
        successfulCount: {
          $sum: { $cond: [{ $eq: ['$status', 'succeeded'] }, 1, 0] }
        },
        failedCount: {
          $sum: { $cond: [{ $in: ['$status', ['failed', 'canceled']] }, 1, 0] }
        },
        refundedAmount: { $sum: '$refundedAmount' }
      }
    }
  ];

  const result = await this.aggregate(pipeline);
  return result[0] || {
    totalAmount: 0,
    totalCount: 0,
    successfulCount: 0,
    failedCount: 0,
    refundedAmount: 0
  };
};

module.exports = mongoose.model("Payment", PaymentSchema);
