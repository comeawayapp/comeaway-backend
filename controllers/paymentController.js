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

    // Add discount if provided
    if (couponCode) {
      const couponValidation = await stripeService.validateCouponCode(couponCode);
      if (couponValidation.valid) {
        options.couponId = couponCode;
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
      success: true
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
    const { priceId, userId, couponCode, promoCode } = req.body;

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

    // Add discount if provided
    if (couponCode) {
      const couponValidation = await stripeService.validateCouponCode(couponCode);
      if (couponValidation.valid) {
        subscriptionOptions.couponId = couponCode;
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
        subscriptionOptions.promoCodeId = promoValidation.promoCode.id;
      } else {
        return res.status(400).json({ 
          message: 'Invalid promotional code',
          error: promoValidation.error 
        });
      }
    }

    // Create subscription (not payment intent)
    const subscription = await stripeService.createSubscription(
      customer.id, 
      priceId, 
      subscriptionOptions
    );
    console.log(subscription, "subscription");

    console.log('Created subscription:', {
      id: subscription.id,
      status: subscription.status,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      latest_invoice: subscription.latest_invoice ? subscription.latest_invoice.id : 'No invoice yet'
    });

    // For incomplete subscriptions, we need to create a payment intent
    // that will be used to collect payment and attach it to the subscription
    let paymentIntent = null;

    if (subscription.status === 'incomplete') {
      // Create a payment intent for the subscription amount
      // This will be used to collect payment and attach it to the subscription
      paymentIntent = await stripe.paymentIntents.create({
        amount: price.unit_amount, // Already in cents from Stripe
        currency: price.currency,
        customer: customer.id,
        payment_method_types: ['card'],
        setup_future_usage: 'off_session', // Save payment method for future use
        metadata: {
          userId: userId,
          subscriptionId: subscription.id,
          priceId: priceId,
          type: 'subscription_setup'
        }
      });
      console.log('Created payment intent for subscription setup:', paymentIntent.id);
    } else {
      // For active subscriptions, get the payment intent from the invoice
      paymentIntent = subscription.latest_invoice.payment_intent;
      console.log('Payment intent from subscription:', paymentIntent?.id);
    }

    // Sync subscription to database
    await stripeService.syncSubscriptionToDatabase(subscription, userId);

    // Sync payment intent to database
    if (paymentIntent) {
      await stripeService.syncPaymentToDatabase(paymentIntent, userId, subscription.id);
    }

    // Respond with the required parameters for the payment sheet
    res.json({
      paymentIntent: paymentIntent ? paymentIntent.client_secret : null,
      ephemeralKey: ephemeralKey.secret,
      customer: customer.id,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      hasPaymentIntent: !!paymentIntent
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
