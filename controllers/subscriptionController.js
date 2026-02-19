const Subscription = require("../models/Subscription");
const User = require("../models/user");
const stripeService = require("../services/stripeService");
const emailService = require("../services/emailService");

// Create a new subscription using Stripe
exports.createSubscription = async (req, res) => {
  try {
    const { priceId, couponCode, promoCode, trialPeriodDays } = req.body;
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!priceId) {
      return res.status(400).json({ message: 'priceId is required' });
    }

    // Validate price exists in Stripe
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    let price;
    try {
      price = await stripe.prices.retrieve(priceId);
    } catch (error) {
      return res.status(404).json({ error: "Price not found" });
    }

    // Check if user already has an active subscription
    const existingSubscription = await Subscription.findOne({
      userId: userId,
      status: { $in: ['active', 'trialing'] }
    });

    if (existingSubscription) {
      return res.status(400).json({ 
        message: 'User already has an active subscription',
        existingSubscription: {
          id: existingSubscription._id,
          status: existingSubscription.status,
          currentPeriodEnd: existingSubscription.currentPeriodEnd
        }
      });
    }

    // Create or get Stripe customer
    const customer = await stripeService.createOrGetCustomer(user);

    // Prepare subscription options
    const options = {
      metadata: {
        userId: userId.toString(),
        priceId: priceId
      }
    };

    // Add trial period if specified
    if (trialPeriodDays) {
      options.trialPeriodDays = trialPeriodDays;
    }

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

    // Create Stripe subscription
    const stripeSubscription = await stripeService.createSubscription(
      customer.id, 
      priceId, 
      options
    );

    // Sync subscription to database
    const subscription = await stripeService.syncSubscriptionToDatabase(
      stripeSubscription, 
      userId
    );

    console.log(
      `✅ Subscription created - User ${userId} is now Pro until ${subscription.currentPeriodEnd}`
    );

    // Get client secret safely
    let clientSecret = null;
    if (stripeSubscription.latest_invoice && 
        stripeSubscription.latest_invoice.payment_intent && 
        stripeSubscription.latest_invoice.payment_intent.client_secret) {
      clientSecret = stripeSubscription.latest_invoice.payment_intent.client_secret;
    }

    res.status(201).json({
      message: "Subscription created successfully",
      subscription: {
        id: subscription._id,
        stripeSubscriptionId: subscription.stripeSubscriptionId,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
        isActive: subscription.isActive
      },
      success: true
    });

  } catch (error) {
    console.error("❌ Subscription creation error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

/**
 * Admin: Create subscription for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createSubscriptionForUser = async (req, res) => {
  try {
    const { userEmail, plan, duration } = req.body;
    
    // Validate required fields
    if (!userEmail || !plan) {
      return res.status(400).json({ 
        message: "userEmail and plan are required" 
      });
    }
    
    // Validate plan
    if (!["monthly", "annual", "daily"].includes(plan)) {
      return res.status(400).json({ 
        message: "Invalid subscription plan. Must be 'monthly' or 'annual' or 'daily'" 
      });
    }
    
    // Validate duration (optional, defaults to 1)
    const subscriptionDuration = duration && !isNaN(duration) ? parseInt(duration) : 1;
    if (subscriptionDuration < 1 || subscriptionDuration > 12) {
      return res.status(400).json({ 
        message: "Duration must be between 1 and 12" 
      });
    }
    
    // Find user by email
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ 
        message: "User not found with the provided email" 
      });
    }
    
    // Check if user already has an active subscription
    const existingActiveSubscription = await Subscription.findOne({
      userId: user._id,
      status: "active"
    });
    
    if (existingActiveSubscription) {
      return res.status(400).json({ 
        message: "User already has an active subscription",
        existingSubscription: existingActiveSubscription
      });
    }
    
    // Calculate dates
    const startDate = new Date();
    let endDate = new Date();
    
    if (plan === "monthly") {
      endDate.setMonth(endDate.getMonth() + subscriptionDuration);
    } else if (plan === "annual") {
      endDate.setFullYear(endDate.getFullYear() + subscriptionDuration);
    }else if (plan === "daily") {
      endDate.setDate(endDate.getDate() + subscriptionDuration);
    }
    
    // Create new subscription
    const newSubscription = new Subscription({
      userId: user._id,
      customer: user.stripeCustomerId || `admin_created_${Date.now()}`,
      name: `${user.firstname || ''} ${user.lastname || ''}`.trim() || 'Admin Created User',
      plan,
      startDate,
      endDate,
      status: "active",
      createdBy: "admin",
      adminNotes: `Created by admin for ${subscriptionDuration} ${plan === 'monthly' ? 'month(s)' : 'year(s)'}`
    });
    
    await newSubscription.save();
    
    // Update user's pro status
    await User.findByIdAndUpdate(user._id, {
      isPro: true,
      proExpiresAt: endDate,
      proUpdatedBy: "admin"
    });
    
    console.log(
      `✅ Admin created subscription - User ${user.email} is now Pro until ${endDate}`
    );
    
    res.status(201).json({
      message: "Subscription created successfully for user",
      subscription: newSubscription,
      user: {
        _id: user._id,
        email: user.email,
        name: `${user.firstname || ''} ${user.lastname || ''}`.trim(),
        isPro: true,
        proExpiresAt: endDate
      },
      success: true
    });
    
  } catch (error) {
    console.error("❌ Admin subscription creation error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Get subscription by user ID
exports.getSubscriptionByUserId = async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid or missing userId" });
    }
    
    const subscriptions = await Subscription.find({ userId: userId })
      .sort({ createdAt: -1 })
      .populate('userId', 'firstname lastname email');
      
    if (!subscriptions || !subscriptions.length) {
      return res.status(200).json({ 
        message: "No subscription found", 
        subscriptions: [] 
      });
    }
    
    res.status(200).json({
      message: "Subscriptions retrieved successfully",
      subscriptions: subscriptions
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all user subscription plans and statuses for admin
exports.getAllUserSubscriptionPlansAndStatuses = async (req, res) => {
  try {
    const subscriptions = await Subscription.find();
    if (!subscriptions.length) {
      return res.status(404).json({ message: "No subscriptions found" });
    }
    res.status(200).json(subscriptions);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Renew an existing subscription
exports.renewSubscription = async (req, res) => {
  try {
    const { subscriptionId, plan } = req.body;
    const userId = req.user && req.user._id;

    if (!subscriptionId || !plan || !userId) {
      return res.status(400).json({
        message: "subscriptionId, plan, and userId are required",
      });
    }

    if (!["monthly", "annual"].includes(plan)) {
      return res.status(400).json({ message: "Invalid subscription plan" });
    }

    // Find the existing subscription
    const subscription = await Subscription.findOne({
      _id: subscriptionId,
      userId: userId,
    });

    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    // Calculate new end date from current end date or now (whichever is later)
    const currentDate = new Date();
    const startDate =
      subscription.endDate > currentDate ? subscription.endDate : currentDate;
    let newEndDate = new Date(startDate);

    if (plan === "monthly") {
      newEndDate.setMonth(newEndDate.getMonth() + 1);
    } else if (plan === "annual") {
      newEndDate.setFullYear(newEndDate.getFullYear() + 1);
    }

    // Update subscription
    subscription.endDate = newEndDate;
    subscription.plan = plan;
    subscription.status = "active";
    await subscription.save();

    // Update user's Pro status
    await User.findByIdAndUpdate(userId, {
      isPro: true,
      proExpiresAt: newEndDate,
    });

    // Send renewal confirmation email
    try {
      const userDoc = await User.findById(userId);
      if (userDoc) {
        emailService
          .sendSubscriptionConfirmation(
            userDoc.email,
            userDoc.firstname,
            plan,
            newEndDate
          )
          .catch((error) => {
            console.error("Failed to send renewal confirmation email:", error);
          });
      }
    } catch (error) {
      console.error("Error fetching user for renewal email:", error);
    }

    res.status(200).json({
      message: "Subscription renewed successfully",
      subscription: subscription,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Cancel a subscription
exports.cancelSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { cancelAtPeriodEnd = true } = req.body;
    const userId = req.user && req.user._id;

    if (!subscriptionId || !userId) {
      return res.status(400).json({
        message: "subscriptionId and userId are required",
      });
    }

    // Find subscription
    const subscription = await Subscription.findOne({
      _id: subscriptionId, 
      userId: userId
    });

    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    // Cancel subscription in Stripe
    const stripeSubscription = await stripeService.cancelSubscription(
      subscription.stripeSubscriptionId,
      cancelAtPeriodEnd
    );

    // Update local subscription record
    subscription.status = stripeSubscription.status;
    subscription.cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end;
    subscription.canceledAt = stripeSubscription.canceled_at ? 
      new Date(stripeSubscription.canceled_at * 1000) : null;
    await subscription.save();

    // Update user's Pro status
    const updateData = {
      subscriptionStatus: stripeSubscription.status
    };

    // If canceling immediately, set Pro status to false
    if (!cancelAtPeriodEnd) {
      updateData.isPro = false;
      updateData.proExpiresAt = new Date();
    }

    await User.findByIdAndUpdate(userId, updateData);

    res.status(200).json({
      message: cancelAtPeriodEnd ? 
        "Subscription will be cancelled at the end of the current period" :
        "Subscription cancelled immediately",
      subscription: {
        id: subscription._id,
        stripeSubscriptionId: subscription.stripeSubscriptionId,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        canceledAt: subscription.canceledAt,
        currentPeriodEnd: subscription.currentPeriodEnd
      }
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Check and update expired subscriptions (can be called by cron job)
exports.checkExpiredSubscriptions = async (req, res) => {
  try {
    const currentDate = new Date();

    // Find all active subscriptions that have expired
    const expiredSubscriptions = await Subscription.find({
      status: "active",
      endDate: { $lt: currentDate },
    });

    let updatedCount = 0;

    for (const subscription of expiredSubscriptions) {
      // Update subscription status
      subscription.status = "canceled";
      await subscription.save();

      // Update user's Pro status
      await User.findByIdAndUpdate(subscription.userId, {
        isPro: false,
      });

      updatedCount++;
      console.log(`Expired subscription for user ${subscription.userId}`);
    }

    if (res) {
      res.status(200).json({
        message: `Processed ${updatedCount} expired subscriptions`,
        expiredCount: updatedCount,
      });
    }

    return updatedCount;
  } catch (error) {
    console.error("Error checking expired subscriptions:", error);
    if (res) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
    return 0;
  }
};

// Get current user's subscription status
exports.getMySubscription = async (req, res) => {
  try {
    const userId = req.user && req.user._id;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Get user details
    const user = await User.findById(userId).select("isPro proExpiresAt subscriptionStatus subscriptionCurrentPeriodEnd stripeSubscriptionId");

    // Get active subscription
    const subscription = await Subscription.findOne({
      userId: userId,
      status: { $in: ['active', 'trialing'] }
    }).sort({ currentPeriodEnd: -1 }); // Get the latest active subscription

    // Check if subscription is expired
    const currentDate = new Date();
    const isExpired = subscription ? 
      subscription.currentPeriodEnd < currentDate : 
      (user.proExpiresAt ? currentDate > user.proExpiresAt : true);

    // Determine user type and activation method
    const userType = (user.isPro && !isExpired) ? "Pro" : "Standard";
    const activationMethod = user.activationMode || "None";
    
    res.status(200).json({
      isPro: user.isPro && !isExpired,
      proExpiresAt: user.proExpiresAt,
      subscription: subscription ? {
        id: subscription._id,
        stripeSubscriptionId: subscription.stripeSubscriptionId,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        isActive: subscription.isActive,
        isInTrial: subscription.isInTrial,
        daysUntilRenewal: subscription.getDaysUntilRenewal()
      } : null,
      isExpired: isExpired,
      userType: userType,
      activationMethod: activationMethod,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionCurrentPeriodEnd: user.subscriptionCurrentPeriodEnd
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
