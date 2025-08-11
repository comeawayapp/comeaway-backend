const Subscription = require("../models/Subscription");
const User = require("../models/user");
const emailService = require("../services/emailService");

// Create a new subscription - SIMPLIFIED for mobile
exports.createSubscription = async (req, res) => {
  try {
    const { plan, customer, name } = req.body;
    const userId = req.user && req.user._id;

    if (!plan || !customer || !name || !userId) {
      return res
        .status(400)
        .json({ message: "plan, customer, name, and userId are required" });
    }
    if (!["monthly", "annual"].includes(plan)) {
      return res.status(400).json({ message: "Invalid subscription plan" });
    }

    // Calculate the end date based on the plan
    let endDate = new Date();
    if (plan === "monthly") {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (plan === "annual") {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    // Create new subscription with active status
    const newSubscription = new Subscription({
      userId,
      customer,
      name,
      plan,
      endDate,
      status: "active", // This is the key - status is active
    });

    await newSubscription.save();

    // AUTOMATICALLY set isPro = true when subscription is active
    await User.findByIdAndUpdate(userId, {
      isPro: true,
      proExpiresAt: endDate,
    });

    console.log(
      `✅ Subscription created - User ${userId} is now Pro until ${endDate}`
    );

    // Simple success response
    res.status(201).json({
      message: "Subscription created successfully",
      subscription: newSubscription,
      success: true,
    });
  } catch (error) {
    console.error("❌ Subscription creation error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get subscription by user ID
exports.getSubscriptionByUserId = async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid or missing userId" });
    }
    const subscription = await Subscription.find({ userId: userId });
    if (!subscription || !subscription.length) {
      return res.status(404).json({ message: "Subscription not found" });
    }
    res.status(200).json(subscription);
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
    const userId = req.user && req.user._id;

    if (!subscriptionId || !userId) {
      return res.status(400).json({
        message: "subscriptionId and userId are required",
      });
    }

    // Find and update subscription
    const subscription = await Subscription.findOneAndUpdate(
      { _id: subscriptionId, userId: userId },
      { status: "inactive" },
      { new: true }
    );

    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    // Update user's Pro status to expire immediately
    await User.findByIdAndUpdate(userId, {
      isPro: false,
      proExpiresAt: new Date(), // Set to current date to expire immediately
    });

    res.status(200).json({
      message: "Subscription cancelled successfully",
      subscription: subscription,
    });
  } catch (error) {
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
      subscription.status = "inactive";
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
    const user = await User.findById(userId).select("isPro proExpiresAt");

    // Get active subscription
    const subscription = await Subscription.findOne({
      userId: userId,
      status: "active",
    }).sort({ endDate: -1 }); // Get the latest active subscription

    const currentDate = new Date();
    const isExpired =
      user.proExpiresAt ? currentDate > user.proExpiresAt : true;

    // Determine user type and activation method
    const userType = (user.isPro && !isExpired) ? "Pro" : "Standard";
    const activationMethod = user.activationMode || "None";
    
    res.status(200).json({
      isPro: user.isPro && !isExpired,
      proExpiresAt: user.proExpiresAt,
      subscription: subscription,
      isExpired: isExpired,
      userType: userType,
      activationMethod: activationMethod,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
