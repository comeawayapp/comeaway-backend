const Subscription = require("../models/Subscription");
const User = require("../models/user");
const Entitlement = require("../models/Entitlement");
const stripeService = require("../services/stripeService");
const emailService = require("../services/emailService");
const { checkAndUpdateProStatus } = require("./user/helpers");
const { resolveSubscriptionPrice } = require("../utils/subscriptionPrice");
const {
  getTwoDayReminderWindow,
  getPeriodEnd,
  sameInstant,
} = require("../utils/subscriptionReminder");

/** Prefer active/trialing; else most recent by period end */
async function findLatestSubscriptionForUser(userId) {
  const active = await Subscription.findOne({
    userId,
    status: { $in: ["active", "trialing"] },
  }).sort({ currentPeriodEnd: -1, endDate: -1, updatedAt: -1 });

  if (active) return active;

  return Subscription.findOne({ userId }).sort({
    currentPeriodEnd: -1,
    endDate: -1,
    updatedAt: -1,
  });
}

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

// Check and update expired subscriptions, proExpiresAt users, and expired entitlements
// Can be called by cron job or admin route
exports.checkExpiredSubscriptions = async (req, res) => {
  try {
    const currentDate = new Date();
    let subscriptionExpiredCount = 0;
    let proExpiresAtCount = 0;
    let entitlementExpiredCount = 0;

    // 1) Stripe/local Subscription documents past endDate
    const expiredSubscriptions = await Subscription.find({
      status: "active",
      endDate: { $lt: currentDate },
    });

    for (const subscription of expiredSubscriptions) {
      subscription.status = "canceled";
      await subscription.save();

      await User.findByIdAndUpdate(subscription.userId, {
        isPro: false,
        activationMode: null,
      });

      subscriptionExpiredCount++;
      console.log(`Expired subscription for user ${subscription.userId}`);
    }

    // 2) Users with isPro whose proExpiresAt is past
    const expiredProUsers = await User.find({
      isPro: true,
      proExpiresAt: { $lt: currentDate },
    });

    for (const proUser of expiredProUsers) {
      proUser.isPro = false;
      proUser.activationMode = null;
      await proUser.save();
      proExpiresAtCount++;
      console.log(`Expired proExpiresAt for user ${proUser._id}`);
    }

    // 3) Redeemed entitlements past subscriptionExpiresAt / expiryDate
    const expiredEntitlements = await Entitlement.find({
      redeemed: true,
      redeemedBy: { $ne: null },
      $or: [
        { subscriptionExpiresAt: { $lt: currentDate } },
        {
          $and: [
            {
              $or: [
                { subscriptionExpiresAt: null },
                { subscriptionExpiresAt: { $exists: false } },
              ],
            },
            { expiryDate: { $lt: currentDate } },
          ],
        },
      ],
    });

    for (const entitlement of expiredEntitlements) {
      const entitledUser = await User.findById(entitlement.redeemedBy);
      if (!entitledUser || !entitledUser.isPro) {
        continue;
      }

      // Don't wipe PRO if they still have an active paid subscription
      const activeSub = await Subscription.findOne({
        userId: entitledUser._id,
        status: { $in: ["active", "trialing"] },
        $or: [
          { endDate: { $gt: currentDate } },
          { currentPeriodEnd: { $gt: currentDate } },
        ],
      });
      if (activeSub) {
        continue;
      }

      entitledUser.isPro = false;
      entitledUser.activationMode = null;
      if (entitlement.subscriptionExpiresAt || entitlement.expiryDate) {
        entitledUser.proExpiresAt =
          entitlement.subscriptionExpiresAt || entitlement.expiryDate;
      }
      await entitledUser.save();
      entitlementExpiredCount++;
      console.log(
        `Expired entitlement ${entitlement.entitlementId} downgraded user ${entitledUser._id}`
      );
    }

    const total =
      subscriptionExpiredCount + proExpiresAtCount + entitlementExpiredCount;

    if (res) {
      res.status(200).json({
        message: `Processed ${total} expirations`,
        expiredCount: total,
        subscriptionExpiredCount,
        proExpiresAtCount,
        entitlementExpiredCount,
      });
    }

    return total;
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

    // Get user details and persist downgrade if proExpiresAt passed
    let user = await User.findById(userId).select(
      "isPro proExpiresAt subscriptionStatus subscriptionCurrentPeriodEnd stripeSubscriptionId activationMode"
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user = await checkAndUpdateProStatus(user);

    // Get active subscription
    const subscription = await Subscription.findOne({
      userId: userId,
      status: { $in: ["active", "trialing"] },
    }).sort({ currentPeriodEnd: -1 });

    const currentDate = new Date();
    const isExpired = subscription
      ? subscription.currentPeriodEnd < currentDate
      : user.proExpiresAt
        ? currentDate > user.proExpiresAt
        : false;

    const userType = user.isPro && !isExpired ? "Pro" : "Standard";
    const activationMethod = user.activationMode || "None";

    res.status(200).json({
      isPro: user.isPro && !isExpired,
      proExpiresAt: user.proExpiresAt,
      subscription: subscription
        ? {
            id: subscription._id,
            stripeSubscriptionId: subscription.stripeSubscriptionId,
            status: subscription.status,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            isActive: subscription.isActive,
            isInTrial: subscription.isInTrial,
            daysUntilRenewal: subscription.getDaysUntilRenewal(),
          }
        : null,
      isExpired: isExpired,
      userType: userType,
      activationMethod: activationMethod,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionCurrentPeriodEnd: user.subscriptionCurrentPeriodEnd,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * GET /api/subscription/me/details
 * Authenticated user's subscription: plan, price (best-effort), start/end dates.
 */
exports.getMySubscriptionDetails = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const subscription = await findLatestSubscriptionForUser(userId);
    if (!subscription) {
      return res.status(404).json({
        message: "No subscription found for this user",
        code: "SUBSCRIPTION_NOT_FOUND",
      });
    }

    const startDate =
      subscription.currentPeriodStart || subscription.startDate || null;
    const endDate = getPeriodEnd(subscription);
    const pricing = await resolveSubscriptionPrice(subscription);

    return res.status(200).json({
      plan: subscription.plan || null,
      price: pricing.price,
      price_cents: pricing.price_cents,
      currency: pricing.currency,
      start_date: startDate,
      end_date: endDate,
      status: subscription.status,
      cancel_at_period_end: !!subscription.cancelAtPeriodEnd,
      cancellation_reason: subscription.cancellationReason || null,
      allow_2_days_reminder: subscription.allowTwoDayReminder !== false,
      subscription_id: subscription._id,
    });
  } catch (error) {
    console.error("getMySubscriptionDetails error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

/**
 * PUT|POST /api/subscription/me/preferences
 * Stores cancellation_reason and/or allow_2_days_reminder on the user's subscription.
 * Does not cancel Stripe.
 */
exports.updateMySubscriptionPreferences = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const { cancellation_reason, allow_2_days_reminder } = req.body || {};
    const hasReason = Object.prototype.hasOwnProperty.call(
      req.body || {},
      "cancellation_reason"
    );
    const hasReminder = Object.prototype.hasOwnProperty.call(
      req.body || {},
      "allow_2_days_reminder"
    );

    if (!hasReason && !hasReminder) {
      return res.status(400).json({
        message:
          "Provide cancellation_reason and/or allow_2_days_reminder",
      });
    }

    if (hasReminder && typeof allow_2_days_reminder !== "boolean") {
      return res.status(400).json({
        message: "allow_2_days_reminder must be a boolean",
      });
    }

    if (
      hasReason &&
      cancellation_reason != null &&
      typeof cancellation_reason !== "string"
    ) {
      return res.status(400).json({
        message: "cancellation_reason must be a string or null",
      });
    }

    const subscription = await findLatestSubscriptionForUser(userId);
    if (!subscription) {
      return res.status(404).json({
        message: "No subscription found for this user",
        code: "SUBSCRIPTION_NOT_FOUND",
      });
    }

    const previousCancelAtPeriodEnd = subscription.cancelAtPeriodEnd;
    const previousStatus = subscription.status;

    if (hasReason) {
      subscription.cancellationReason =
        cancellation_reason == null || cancellation_reason === ""
          ? null
          : String(cancellation_reason).trim();
    }
    if (hasReminder) {
      subscription.allowTwoDayReminder = allow_2_days_reminder;
    }

    await subscription.save();

    return res.status(200).json({
      message: "Subscription preferences updated",
      subscription_id: subscription._id,
      cancellation_reason: subscription.cancellationReason || null,
      allow_2_days_reminder: subscription.allowTwoDayReminder !== false,
      cancel_at_period_end: !!subscription.cancelAtPeriodEnd,
      status: subscription.status,
      unchanged_cancel_state:
        previousCancelAtPeriodEnd === subscription.cancelAtPeriodEnd &&
        previousStatus === subscription.status,
    });
  } catch (error) {
    console.error("updateMySubscriptionPreferences error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

/**
 * Scan Subscription table for period ends ~2 days out and email opted-in users.
 * Window: [now+1d, now+3d). Does not query Entitlement.
 * Usable from cron (no res) or HTTP admin trigger.
 */
exports.sendTwoDayExpiryReminders = async (req, res) => {
  try {
    const { windowStart, windowEnd } = getTwoDayReminderWindow(new Date());

    const candidates = await Subscription.find({
      allowTwoDayReminder: true,
      status: { $in: ["active", "trialing"] },
      $or: [
        {
          currentPeriodEnd: { $gte: windowStart, $lt: windowEnd },
        },
        {
          $and: [
            {
              $or: [
                { currentPeriodEnd: null },
                { currentPeriodEnd: { $exists: false } },
              ],
            },
            { endDate: { $gte: windowStart, $lt: windowEnd } },
          ],
        },
      ],
    });

    let sent = 0;
    let skipped = 0;
    const errors = [];

    for (const subscription of candidates) {
      const periodEnd = getPeriodEnd(subscription);
      if (!periodEnd) {
        skipped += 1;
        continue;
      }

      if (
        sameInstant(subscription.expiryReminderSentForPeriodEnd, periodEnd)
      ) {
        skipped += 1;
        continue;
      }

      const user = await User.findById(subscription.userId).select(
        "email firstname"
      );
      if (!user || !user.email) {
        skipped += 1;
        continue;
      }

      try {
        await emailService.sendSubscriptionExpiryReminder(
          user.email,
          user.firstname || "there",
          periodEnd,
          subscription.plan || "pro"
        );
        subscription.expiryReminderSentForPeriodEnd = periodEnd;
        await subscription.save();
        sent += 1;
      } catch (err) {
        errors.push({
          subscriptionId: subscription._id,
          error: err.message,
        });
        console.error(
          "sendTwoDayExpiryReminders email failed:",
          subscription._id,
          err
        );
      }
    }

    const result = {
      message: `Sent ${sent} expiry reminder(s)`,
      sent,
      skipped,
      scanned: candidates.length,
      window_start: windowStart.toISOString(),
      window_end: windowEnd.toISOString(),
      errors,
    };

    if (res) {
      return res.status(200).json(result);
    }
    return result;
  } catch (error) {
    console.error("sendTwoDayExpiryReminders error:", error);
    if (res) {
      return res
        .status(500)
        .json({ message: "Server error", error: error.message });
    }
    throw error;
  }
};
