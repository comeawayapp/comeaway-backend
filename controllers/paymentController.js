require("dotenv").config();
const stripeService = require("../services/stripeService");
const User = require("../models/user");
const Payment = require("../models/Payment");
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


/**
 * Controller to create checkout session for subscription
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const createCheckoutSession = async (req, res) => {
  try {
    const { priceId, successUrl, cancelUrl, couponCode, promoCode } = req.body;
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Validate price exists in Stripe
    let price;
    try {
      price = await stripe.prices.retrieve(priceId);
    } catch (error) {
      return res.status(404).json({ message: 'Price not found' });
    }
    console.log(price, "price");

    // Create or get Stripe customer
    const customer = await stripeService.createOrGetCustomer(user);

    // Prepare options for checkout session
    const options = {
      successUrl: successUrl || `${process.env.FRONTEND_URL}/success`,
      cancelUrl: cancelUrl || `${process.env.FRONTEND_URL}/pricing`,
      metadata: {
        userId: userId.toString(),
        priceId: priceId
      }
    };

    // Add discount if provided - Enhanced coupon flow
    if (couponCode) {
      const couponValidation = await stripeService.validateCouponCode(couponCode);
      console.log(couponValidation, "couponValidation");
      if (couponValidation.valid) {
        options.couponId = couponValidation.coupon.id; // Use coupon.id instead of couponCode
        console.log("Setting coupon for checkout session:", options.couponId);
      } else {
        return res.status(400).json({
          message: 'Invalid coupon code',
          error: couponValidation.error
        });
      }
    }

    if (promoCode) {
      const promoValidation = await stripeService.validatePromoCode(promoCode);
      if (promoValidation.valid) {
        options.promoCodeId = promoValidation.promoCode.id;
        console.log("Setting promo code for checkout session:", options.promoCodeId);
      } else {
        return res.status(400).json({
          message: 'Invalid promotional code',
          error: promoValidation.error
        });
      }
    }
    console.log(options, "options");

    // Create checkout session
    const session = await stripeService.createCheckoutSession(customer.id, priceId, options);

    res.status(200).json({
      sessionId: session.id,
      url: session.url,
      success: true,
      // Include discount information if applied
      discountApplied: options.couponId || options.promoCodeId ? {
        type: options.couponId ? 'coupon' : 'promotion_code',
        id: options.couponId || options.promoCodeId
      } : null
    });

  } catch (error) {
    console.error('Checkout session error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Controller to create payment sheet parameters for mobile payments
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const createPaymentSheet = async (req, res) => {
  try {
    const { priceId, userId, couponCode, promoCode, trialDays = 0 } = req.body;

    // Validate required fields
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    if (!priceId) {
      return res.status(400).json({ error: "priceId is required" });
    }

    // Get user from database
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Validate price exists in Stripe
    let price;
    try {
      price = await stripe.prices.retrieve(priceId);
    } catch (error) {
      return res.status(404).json({ error: "Price not found" });
    }

    // Create or get Stripe customer
    const customer = await stripeService.createOrGetCustomer(user);

    // Create an ephemeral key for the customer
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer.id },
      { apiVersion: "2025-02-24.acacia" }
    );

    // Prepare subscription options
    const subscriptionOptions = {
      metadata: {
        userId: userId,
        priceId: priceId,
        type: 'subscription'
      }
    };

    // Add trial period if specified
    if (trialDays > 0) {
      subscriptionOptions.trial_period_days = trialDays;
    }

    // FIXED: Add discount if provided - Use coupon ID, not name
    if (couponCode) {
      const couponValidation = await stripeService.validateCouponCode(couponCode);
      console.log(couponValidation, "couponValidation");
      if (couponValidation.valid) {
        subscriptionOptions.discounts = [{
          coupon: couponValidation.coupon.id  // Use coupon.id instead of coupon.name
        }];
        console.log("Setting coupon discount:", subscriptionOptions.discounts);
      } else {
        return res.status(400).json({
          message: 'Invalid coupon code',
          error: couponValidation.error
        });
      }
    }

    // FIXED: Use discounts array for promo codes too
    if (promoCode) {
      const promoValidation = await stripeService.validatePromoCode(promoCode);
      if (promoValidation.valid) {
        // If both coupon and promo code, promo code takes precedence
        subscriptionOptions.discounts = [{
          promotion_code: promoValidation.promoCode.id
        }];
        console.log("Setting promo code discount:", subscriptionOptions.discounts);
      } else {
        return res.status(400).json({
          message: 'Invalid promotional code',
          error: promoValidation.error
        });
      }
    }

    // Create subscription
    const subscription = await stripeService.createSubscription(
      customer.id,
      priceId,
      subscriptionOptions
    );

    // Debug: Log subscription details
    console.log('=== SUBSCRIPTION CREATED ===');
    console.log('Subscription ID:', subscription.id);
    console.log('Status:', subscription.status);
    console.log('Latest Invoice:', subscription.latest_invoice ? {
      id: subscription.latest_invoice.id,
      amount_due: subscription.latest_invoice.amount_due,
      payment_intent: subscription.latest_invoice.payment_intent ? {
        id: subscription.latest_invoice.payment_intent.id,
        status: subscription.latest_invoice.payment_intent.status,
        client_secret: subscription.latest_invoice.payment_intent.client_secret ? 'present' : 'missing'
      } : 'NO PAYMENT INTENT'
    } : 'NO INVOICE');
    console.log('Discount:', subscription.discount);
    console.log('=== END SUBSCRIPTION DEBUG ===');

    let paymentIntent = null;
    let setupIntent = null;

    // Handle different subscription statuses
    if (subscription.status === 'trialing') {
      // For trial subscriptions, there might be a setup intent to collect payment method
      setupIntent = subscription.pending_setup_intent;
      console.log('Subscription is trialing, setup intent:', setupIntent?.id);
    } else if (subscription.status === 'incomplete') {
      // FIXED: Use the payment intent that Stripe already created for the subscription
      // Don't create a new one - this was causing duplicate payment intents
      paymentIntent = subscription.latest_invoice?.payment_intent;
      console.log('Using existing payment intent from subscription:', paymentIntent?.id);
      
      if (!paymentIntent) {
        console.log('No payment intent found in subscription - this should not happen with default_incomplete_payment_behavior');
        // With default_incomplete_payment_behavior, Stripe should always create a payment intent
        // If we get here, something went wrong
      }
    } else if (subscription.status === 'active') {
      // For active subscriptions, get payment intent from invoice
      paymentIntent = subscription.latest_invoice?.payment_intent;
      console.log('Payment intent from subscription:', paymentIntent?.id);
    }

    // Sync subscription to database
    await stripeService.syncSubscriptionToDatabase(subscription, userId);

    // Sync payment intent to database
    if (paymentIntent) {
      await stripeService.syncPaymentToDatabase(paymentIntent, userId, subscription.id);
    }

    // Calculate discount information for response
    let discountInfo = null;
    if (subscription.discount) {
      const discount = subscription.discount;
      discountInfo = {
        type: discount.coupon ? 'coupon' : 'promotion_code',
        id: discount.coupon?.id || discount.promotion_code?.id,
        name: discount.coupon?.name || discount.promotion_code?.code,
        percentOff: discount.coupon?.percent_off || null,
        amountOff: discount.coupon?.amount_off || null,
        start: discount.start,
        end: discount.end
      };
    }

    // Enhanced response with discount information
    res.json({
      paymentIntent: paymentIntent ? paymentIntent.client_secret : null,
      setupIntent: setupIntent ? setupIntent.client_secret : null,
      ephemeralKey: ephemeralKey.secret,
      customer: customer.id,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      hasPaymentIntent: !!paymentIntent,
      hasSetupIntent: !!setupIntent,
      // Include pricing and discount information
      originalAmount: price.unit_amount,
      finalAmount: paymentIntent ? paymentIntent.amount : (subscription.latest_invoice?.amount_due || price.unit_amount),
      currency: price.currency,
      discountApplied: discountInfo,
      // Trial information
      trialEnd: subscription.trial_end,
      isTrialing: subscription.status === 'trialing'
    });

  } catch (error) {
    console.error("Error creating payment sheet params:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Controller to get payment status
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const getPaymentStatus = async (req, res) => {
  try {
    const { paymentIntentId } = req.params;
    const userId = req.user._id;

    // Get payment from database
    const payment = await Payment.findOne({
      stripePaymentIntentId: paymentIntentId,
      userId: userId
    });

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Get latest status from Stripe
    const paymentIntent = await stripeService.getPaymentIntent(paymentIntentId);

    // Update local payment record
    payment.status = paymentIntent.status;
    payment.paidAt = paymentIntent.status === 'succeeded' ? new Date() : null;
    await payment.save();

    res.status(200).json({
      paymentId: payment._id,
      status: payment.status,
      amount: payment.formattedAmount,
      paidAt: payment.paidAt,
      isSuccessful: payment.isSuccessful
    });

  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Controller to get user's payment history
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10, status } = req.query;

    const query = { userId };
    if (status) {
      query.status = status;
    }

    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('subscriptionId', 'stripeSubscriptionId status planType');

    const total = await Payment.countDocuments(query);

    res.status(200).json({
      payments,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalPayments: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
  createCheckoutSession,
  createPaymentSheet,
  getPaymentStatus,
  getPaymentHistory,
};
