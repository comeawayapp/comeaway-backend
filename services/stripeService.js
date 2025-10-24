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
// Updated Stripe Service - createSubscription method
async createSubscription(customerId, priceId, options = {}) {
  const subscriptionData = {
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent', 'pending_setup_intent'], // Added pending_setup_intent for trials
    metadata: options.metadata || {}
  };

  // Add trial period if specified
  if (options.trialPeriodDays || options.trial_period_days) {
    subscriptionData.trial_period_days = options.trialPeriodDays || options.trial_period_days;
  }

  // UPDATED: Use discounts array instead of deprecated coupon parameter
  if (options.couponId || options.discounts) {
    if (options.discounts) {
      // If discounts array is provided directly, use it
      subscriptionData.discounts = options.discounts;
    } else if (options.couponId) {
      // Convert legacy couponId to discounts array
      subscriptionData.discounts = [{ coupon: options.couponId }];
    }
  }

  // UPDATED: Use discounts array for promo codes too
  if (options.promoCodeId && !subscriptionData.discounts) {
    subscriptionData.discounts = [{ promotion_code: options.promoCodeId }];
  }

  console.log('Creating subscription with data:', JSON.stringify(subscriptionData, null, 2));

  try {
    const subscription = await stripe.subscriptions.create(subscriptionData);
    console.log('Subscription created:', {
      id: subscription.id,
      status: subscription.status,
      discount: subscription.discount,
      amount_due: subscription.latest_invoice?.amount_due,
      ...subscription
    });
    return subscription;
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw error;
  }
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

    // Add discounts if specified - Handle both coupon and promo code
    if (options.couponId || options.promoCodeId) {
      sessionData.discounts = [];
      
      if (options.couponId) {
        sessionData.discounts.push({
          coupon: options.couponId
        });
      }
      
      if (options.promoCodeId) {
        sessionData.discounts.push({
          promotion_code: options.promoCodeId
        });
      }
    }

    console.log('Creating checkout session with data:', JSON.stringify(sessionData, null, 2));
    
    const session = await stripe.checkout.sessions.create(sessionData);
    
    console.log('Checkout session created:', {
      id: session.id,
      url: session.url,
      discounts: session.discounts
    });
    
    return session;
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
      console.log('new new actual subscription', stripeSubscription);
      // Defensive check: if stripeSubscription is a string, retrieve the full object
      if (typeof stripeSubscription === 'string') {
        console.log('Warning: syncSubscriptionToDatabase received string instead of object, retrieving subscription:', stripeSubscription);
        stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscription);
        console.log('full subscription', stripeSubscription);

      }

      // Validate that we have a proper subscription object
      if (!stripeSubscription || !stripeSubscription.id) {
        throw new Error('Invalid subscription object provided to syncSubscriptionToDatabase');
      }

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
        isPro: stripeSubscription.status === 'active' || stripeSubscription.status === 'trialing',
        subscriptionCurrentPeriodEnd: null,
        proExpiresAt: null,
        proUpdatedBy:"stripe"
      };

      // Handle trial period - if trialing, use trial_end, otherwise use current_period_end
      if (stripeSubscription.status === 'trialing' && stripeSubscription.trial_end) {
        userUpdateData.subscriptionCurrentPeriodEnd = new Date(stripeSubscription.trial_end * 1000);
        userUpdateData.proExpiresAt = new Date(stripeSubscription.trial_end * 1000);
      } else if (stripeSubscription.current_period_end) {
        userUpdateData.subscriptionCurrentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
        userUpdateData.proExpiresAt = new Date(stripeSubscription.current_period_end * 1000 );
      }else{
        userUpdateData.proExpiresAt = stripeSubscription.plan.interval == 'month' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        userUpdateData.subscriptionCurrentPeriodEnd = stripeSubscription.plan.interval == 'month' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      }

      console.log('userUpdateData', userId, userUpdateData);

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

  // Fetch coupons
  async getCoupons(options = {}) {
    try {
      const params = {
        limit: options.limit || 100
      };

      if (options.starting_after) {
        params.starting_after = options.starting_after;
      }

      if (options.ending_before) {
        params.ending_before = options.ending_before;
      }

      const coupons = await stripe.coupons.list(params);
      return {
        success: true,
        coupons: coupons.data,
        hasMore: coupons.has_more
      };
    } catch (error) {
      console.error('Error fetching coupons:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Fetch promotional codes
  async getPromoCodes(options = {}) {
    try {
      const params = {
        limit: options.limit || 100
      };

      if (options.active !== undefined) {
        params.active = options.active;
      }

      if (options.coupon) {
        params.coupon = options.coupon;
      }

      if (options.code) {
        params.code = options.code;
      }

      const promoCodes = await stripe.promotionCodes.list(params);
      return {
        success: true,
        promoCodes: promoCodes.data,
        hasMore: promoCodes.has_more
      };
    } catch (error) {
      console.error('Error fetching promotional codes:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Fetch products with their prices and associated coupons
  async getProductsWithPrices(options = {}) {
    try {
      const productsResult = await this.getProducts(options);
      if (!productsResult.success) {
        return productsResult;
      }

      const products = productsResult.products;
      const productsWithPrices = [];

      // Get all coupons and promotional codes
      const couponsResult = await this.getCoupons({ limit: 100 });
      const promoCodesResult = await this.getPromoCodes({ limit: 100 });

      for (const product of products) {
        const pricesResult = await this.getPrices({
          product: product.id,
          active: options.active
        });

        // Find coupons associated with this product
        // We'll look for coupons that have metadata or are associated with this product
        const associatedCoupons = [];
        const associatedPromoCodes = [];

        if (couponsResult.success) {
          // Filter coupons that might be associated with this product
          associatedCoupons.push(...couponsResult.coupons.filter(coupon => {
            // Check if coupon metadata contains product info
            const hasMetadataMatch = coupon.metadata && (
              coupon.metadata.productId === product.id ||
              coupon.metadata.productName === product.name ||
              coupon.metadata.planType === product.metadata?.planType
            );
            
            // If no metadata match, try to match by coupon name or other criteria
            const hasNameMatch = coupon.name && (
              // Match monthly-related coupons to monthly products
              (product.name.toLowerCase().includes('monthly') && 
               (coupon.name.toLowerCase().includes('monthly') || 
                coupon.name.toLowerCase().includes('month'))) ||
              // Match general coupons to all products
              coupon.name.toLowerCase().includes('first timer') ||
              coupon.name.toLowerCase().includes('discount')
            );
            
            return hasMetadataMatch || hasNameMatch;
          }));
        }

        if (promoCodesResult.success) {
          // Filter promotional codes that might be associated with this product
          associatedPromoCodes.push(...promoCodesResult.promoCodes.filter(promoCode => {
            // Check if promo code metadata contains product info
            const hasMetadataMatch = promoCode.metadata && (
              promoCode.metadata.productId === product.id ||
              promoCode.metadata.productName === product.name ||
              promoCode.metadata.planType === product.metadata?.planType
            );
            
            // If no metadata match, try to match by promo code name or other criteria
            const hasNameMatch = promoCode.code && (
              // Match monthly-related promo codes to monthly products
              (product.name.toLowerCase().includes('monthly') && 
               (promoCode.code.toLowerCase().includes('monthly') || 
                promoCode.code.toLowerCase().includes('month'))) ||
              // Match general promo codes to all products
              promoCode.code.toLowerCase().includes('first') ||
              promoCode.code.toLowerCase().includes('discount') ||
              promoCode.code.toLowerCase().includes('save')
            );
            
            return hasMetadataMatch || hasNameMatch;
          }));
        }

        productsWithPrices.push({
          ...product,
          prices: pricesResult.success ? pricesResult.prices : [],
          coupons: associatedCoupons,
          promoCodes: associatedPromoCodes
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
