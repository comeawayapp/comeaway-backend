const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/user');
const Subscription = require('../models/Subscription');
const Payment = require('../models/Payment');

class StripeService {
  // Create or retrieve customer
  async createOrGetCustomer(user) {
    if (user.stripeCustomerId) {
      try {
        return await stripe.customers.retrieve(user.stripeCustomerId);
      } catch (error) {
        console.log('Customer not found, creating new one');
      }
    }
    
    const customer = await stripe.customers.create({
      email: user.email,
      name: `${user.firstname} ${user.lastname}`,
      metadata: { userId: user._id.toString() }
    });
    
    // Update user with customer ID
    await User.findByIdAndUpdate(user._id, { stripeCustomerId: customer.id });
    
    return customer;
  }

  // Create subscription
  async createSubscription(customerId, priceId, options = {}) {
    const subscriptionData = {
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: options.metadata || {}
    };

    // Add trial period if specified
    if (options.trialPeriodDays) {
      subscriptionData.trial_period_days = options.trialPeriodDays;
    }

    // Add coupon if specified
    if (options.couponId) {
      subscriptionData.coupon = options.couponId;
    }

    // Add promotion code if specified
    if (options.promoCodeId) {
      subscriptionData.promotion_code = options.promoCodeId;
    }

    return await stripe.subscriptions.create(subscriptionData);
  }

  // Create checkout session for subscription
  async createCheckoutSession(customerId, priceId, options = {}) {
    const sessionData = {
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: options.successUrl || `${process.env.FRONTEND_URL}/success`,
      cancel_url: options.cancelUrl || `${process.env.FRONTEND_URL}/pricing`,
      metadata: options.metadata || {}
    };

    // Add trial period if specified
    if (options.trialPeriodDays) {
      sessionData.subscription_data = {
        trial_period_days: options.trialPeriodDays
      };
    }

    // Add coupon if specified
    if (options.couponId) {
      sessionData.discounts = [{
        coupon: options.couponId
      }];
    }

    // Add promotion code if specified
    if (options.promoCodeId) {
      sessionData.discounts = [{
        promotion_code: options.promoCodeId
      }];
    }

    return await stripe.checkout.sessions.create(sessionData);
  }



  // Retrieve subscription
  async getSubscription(subscriptionId) {
    return await stripe.subscriptions.retrieve(subscriptionId);
  }

  // Update subscription
  async updateSubscription(subscriptionId, updates) {
    return await stripe.subscriptions.update(subscriptionId, updates);
  }

  // Cancel subscription
  async cancelSubscription(subscriptionId, cancelAtPeriodEnd = true) {
    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: cancelAtPeriodEnd
    });
  }

  // Retrieve payment intent
  async getPaymentIntent(paymentIntentId) {
    return await stripe.paymentIntents.retrieve(paymentIntentId);
  }

  // Sync subscription with database
  async syncSubscriptionToDatabase(stripeSubscription, userId) {
    try {
      // Find or create subscription record
      let subscription = await Subscription.findOne({ 
        stripeSubscriptionId: stripeSubscription.id 
      });

      const subscriptionData = {
        userId: userId,
        stripeSubscriptionId: stripeSubscription.id,
        stripeCustomerId: stripeSubscription.customer,
        stripePriceId: stripeSubscription.items.data[0].price.id,
        status: stripeSubscription.status,
        currentPeriodStart: stripeSubscription.current_period_start ? 
          new Date(stripeSubscription.current_period_start * 1000) : null,
        currentPeriodEnd: stripeSubscription.current_period_end ? 
          new Date(stripeSubscription.current_period_end * 1000) : null,
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        canceledAt: stripeSubscription.canceled_at ? 
          new Date(stripeSubscription.canceled_at * 1000) : null,
        trialStart: stripeSubscription.trial_start ? 
          new Date(stripeSubscription.trial_start * 1000) : null,
        trialEnd: stripeSubscription.trial_end ? 
          new Date(stripeSubscription.trial_end * 1000) : null,
        stripeMetadata: stripeSubscription.metadata || {}
      };

      if (subscription) {
        subscription = await Subscription.findByIdAndUpdate(
          subscription._id, 
          subscriptionData, 
          { new: true }
        );
      } else {
        subscription = new Subscription(subscriptionData);
        await subscription.save();
      }

      // Update user subscription status
      const userUpdateData = {
        stripeSubscriptionId: stripeSubscription.id,
        subscriptionStatus: stripeSubscription.status,
        isPro: stripeSubscription.status === 'active'
      };

      // Only update period dates if they exist
      if (stripeSubscription.current_period_end) {
        userUpdateData.subscriptionCurrentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
        userUpdateData.proExpiresAt = new Date(stripeSubscription.current_period_end * 1000);
      }

      await User.findByIdAndUpdate(userId, userUpdateData);

      return subscription;
    } catch (error) {
      console.error('Error syncing subscription to database:', error);
      throw error;
    }
  }

  // Sync payment to database
  async syncPaymentToDatabase(paymentIntent, userId, stripeSubscriptionId = null) {
    try {
      let mongoSubscriptionId = null;
      
      // If we have a Stripe subscription ID, find the corresponding MongoDB subscription
      if (stripeSubscriptionId) {
        const subscription = await Subscription.findOne({ 
          stripeSubscriptionId: stripeSubscriptionId 
        });
        if (subscription) {
          mongoSubscriptionId = subscription._id;
        }
      }

      const paymentData = {
        userId: userId,
        subscriptionId: mongoSubscriptionId,
        stripePaymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        customerId: paymentIntent.customer,
        description: paymentIntent.description || '',
        metadata: paymentIntent.metadata || {},
        processingType: stripeSubscriptionId ? 'subscription' : 'one_time',
        paidAt: paymentIntent.status === 'succeeded' ? new Date() : null
      };

      const payment = new Payment(paymentData);
      await payment.save();

      return payment;
    } catch (error) {
      console.error('Error syncing payment to database:', error);
      throw error;
    }
  }

  // Validate coupon code
  async validateCouponCode(couponCode) {
    try {
      const coupon = await stripe.coupons.retrieve(couponCode);
      return {
        valid: true,
        coupon: coupon
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  // Validate promotion code
  async validatePromoCode(promoCode) {
    try {
      const promotionCodes = await stripe.promotionCodes.list({
        code: promoCode,
        active: true
      });
      
      if (promotionCodes.data.length === 0) {
        return {
          valid: false,
          error: 'Promotion code not found or inactive'
        };
      }

      return {
        valid: true,
        promoCode: promotionCodes.data[0]
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  // Fetch all products from Stripe
  async getProducts(options = {}) {
    try {
      const params = {
        active: options.active !== false, // Default to active products only
        limit: options.limit || 100,
        expand: options.expand || ['data.default_price']
      };

      if (options.type) {
        params.type = options.type;
      }

      const products = await stripe.products.list(params);
      
      return {
        success: true,
        products: products.data,
        hasMore: products.has_more
      };
    } catch (error) {
      console.error('Error fetching products:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Fetch all prices from Stripe
  async getPrices(options = {}) {
    try {
      const params = {
        active: options.active !== false, // Default to active prices only
        limit: options.limit || 100,
        expand: options.expand || ['data.product']
      };

      if (options.product) {
        params.product = options.product;
      }

      if (options.type) {
        params.type = options.type;
      }

      if (options.currency) {
        params.currency = options.currency;
      }

      const prices = await stripe.prices.list(params);
      return {
        success: true,
        prices: prices.data,
        hasMore: prices.has_more
      };
    } catch (error) {
      console.error('Error fetching prices:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Fetch products with their prices
  async getProductsWithPrices(options = {}) {
    try {
      const productsResult = await this.getProducts(options);
      if (!productsResult.success) {
        return productsResult;
      }

      const products = productsResult.products;
      const productsWithPrices = [];

      for (const product of products) {
        const pricesResult = await this.getPrices({
          product: product.id,
          active: options.active
        });

        productsWithPrices.push({
          ...product,
          prices: pricesResult.success ? pricesResult.prices : []
        });
      }

      return {
        success: true,
        products: productsWithPrices
      };
    } catch (error) {
      console.error('Error fetching products with prices:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new StripeService();
