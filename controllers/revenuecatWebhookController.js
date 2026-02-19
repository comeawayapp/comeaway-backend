const User = require("../models/user");
const Subscription = require("../models/Subscription");
const Payment = require("../models/Payment");
const oneHourInMilliseconds = 4000000;

const revenueCatWebhook = async (req, res, next) => {
  try {
    const { event } = req.body;
    console.log(event, "event");
    switch (event.type) {
      case "INITIAL_PURCHASE":
        await handleRenewal(event);
        break;
      case "EXPIRATION":
        await handleSubscriptionExpiration(event);
        break;
      case "RENEWAL":
        await handleRenewal(event);
        break;
      case "CANCELLATION":
        await handleCancellation(event);
        break;
      case "TRIAL":
        await handleRenewal(event);
        break;
      default:

        console.log(`Unhandled event type: ${event.type}`);
    }
    res.status(200).json({ type: event.type, message: "Event received", status: "success" });
  } catch (error) {
    console.log(error, "error");
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

const handleSubscriptionExpiration = async (event) => {
  console.log(event, "event");
  try {
    // Use app_user_id for consistency with handleRenewal
    const user = await User.findOne({
      _id: event.app_user_id,
    });
    if (!user) {
      console.log(`User not found for revenuecat ID: ${event.app_user_id}`);
      return;
    }
    const subscription = await Subscription.findOne({ userId: user._id });
    if (!subscription) {
      console.log(`Subscription not found for user: ${user.email}`);
      return;
    }
    const subscriptionData = {
      status: "canceled",
      canceledAt: new Date(event.expiration_at_ms + oneHourInMilliseconds),
      currentPeriodEnd: new Date(
        event.expiration_at_ms + oneHourInMilliseconds
      ),
    };
    const updatedSubscription = await Subscription.findByIdAndUpdate(
      subscription._id,
      subscriptionData,
      { new: true }
    );
    const updatedUser = await User.findByIdAndUpdate(user._id, {
      subscriptionStatus: "canceled",
      isPro: false,
      proExpiresAt: new Date(),
      proUpdatedBy: "revenuecat",
      subscriptionCurrentPeriodEnd: new Date(),
    });
    // console.log(`Subscription updated for user: ${user.email}`);
    console.log(`User updated for user: ${user.email}`);
    console.log(`Subscription expired for user: ${user.email}`);
  } catch (error) {
    console.log(error, "error");
  }
};

const handleRenewal = async (event) => {
  console.log(event, "event");
  try {
    const user = await User.findOne({ _id: event.app_user_id });
    if (!user) {
      console.log(`User not found for revenuecat ID: ${event.app_user_id}`);
      return;
    }
    let subscription = await Subscription.findOne({ userId: user._id });
    if (!subscription) {
      const subscriptionData = {
        userId: user._id,
        status: "active",
        stripeSubscriptionId: event.id,
        stripeCustomerId: event.app_user_id,
        stripePriceId: event.product_id,
        currentPeriodStart: new Date(
          event.purchased_at_ms + oneHourInMilliseconds
        ),
        currentPeriodEnd: new Date(
          event.expiration_at_ms + oneHourInMilliseconds
        ),
        cancelAtPeriodEnd: false,
        canceledAt: new Date(event.expiration_at_ms + oneHourInMilliseconds),
        trialStart: null,
        trialEnd: null,
        stripeMetadata: event.original_transaction_id,
      };
      subscription = await Subscription.create(subscriptionData);
      console.log(`Subscription created for user: ${user.email}`);
    } else {
      const subscriptionData = {
        userId: user._id,
        status: "active",
        stripeSubscriptionId: event.id,
        stripeCustomerId: event.app_user_id,
        stripePriceId: event.product_id,
        currentPeriodStart: new Date(
          event.purchased_at_ms + oneHourInMilliseconds
        ),
        currentPeriodEnd: new Date(
          event.expiration_at_ms + oneHourInMilliseconds
        ),
        cancelAtPeriodEnd: false,
        canceledAt: new Date(event.expiration_at_ms + oneHourInMilliseconds),
        trialStart: null,
        trialEnd: null,
        stripeMetadata: event,
      };
      subscription = await Subscription.findByIdAndUpdate(
        subscription._id,
        subscriptionData,
        { new: true }
      );
      console.log(`Subscription updated for user: ${user.email}`);
    }

    const userUpdateData = {
      subscriptionStatus: "active",
      isPro: true,
      proExpiresAt: new Date(event.expiration_at_ms + oneHourInMilliseconds),
      proUpdatedBy: "revenuecat",
      subscriptionCurrentPeriodEnd: new Date(
        event.expiration_at_ms + oneHourInMilliseconds
      ),
    };
    console.log(userUpdateData);

    await Payment.create({
      userId: user._id,
      subscriptionId: subscription._id,
      amount: event.price,
      currency: "usd",
      status: "succeeded",
      customerId: event.app_user_id,
      processingType: "subscription",
      metadata: event,
      paidAt: new Date(event.purchased_at_ms + oneHourInMilliseconds),
    });
    console.log(userUpdateData);
    await User.findByIdAndUpdate(user._id, userUpdateData, { new: true });
    console.log(`User updated for user: ${user.email}`);
    console.log(`Subscription renewed for user: ${user.email}`);
  } catch (error) {
    console.log(error, "error");
  }
};

const handleCancellation = async (event) => {
  console.log(event, "event - Cancellation");
  try {
    const user = await User.findOne({
      _id: event.app_user_id || event.original_app_user_id,
    });
    if (!user) {
      console.log(`User not found for revenuecat ID: ${event.app_user_id}`);
      return;
    }
    const subscription = await Subscription.findOne({ userId: user._id });
    if (!subscription) {
      console.log(`Subscription not found for user: ${user.email}`);
      return;
    }

    // Cancel the subscription (set to cancel at period end)
    const subscriptionData = {
      status: "canceled",
      cancelAtPeriodEnd: true,
      canceledAt: new Date(event.expiration_at_ms + oneHourInMilliseconds),
    };
    await Subscription.findByIdAndUpdate(subscription._id, subscriptionData, {
      new: true,
    });
    console.log(`Subscription canceled for user: ${user.email}`);
  } catch (error) {
    console.log(error, "error");
  }
};

module.exports = revenueCatWebhook;
