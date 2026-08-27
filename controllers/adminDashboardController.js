const User = require("../models/user");
const Subscription = require("../models/Subscription");
const Payment = require("../models/Payment");

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const ACTIVE_USER_FILTER = {
  $and: [
    {
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    },
    {
      $or: [
        { status: "active" },
        { status: { $exists: false } },
        { status: null },
      ],
    },
  ],
};

function intervalToPlan(interval) {
  if (interval === "month") return "monthly";
  if (interval === "year") return "annual";
  if (interval === "day") return "daily";
  return null;
}

async function resolvePlanMap(priceIds) {
  const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
  const map = {};
  await Promise.all(
    priceIds.map(async (priceId) => {
      try {
        const price = await stripe.prices.retrieve(priceId);
        map[priceId] = intervalToPlan(price.recurring?.interval);
      } catch (error) {
        console.error(`Failed to resolve Stripe price ${priceId}:`, error.message);
        map[priceId] = null;
      }
    })
  );
  return map;
}

async function getSubscriptionPlanTotals() {
  const activeSubs = await Subscription.find(
    { status: { $in: ["active", "trialing"] } },
    { plan: 1, stripePriceId: 1 }
  ).lean();

  const priceIdsNeedingLookup = [
    ...new Set(
      activeSubs
        .filter((sub) => !["monthly", "annual", "daily"].includes(sub.plan))
        .map((sub) => sub.stripePriceId)
        .filter(Boolean)
    ),
  ];

  const pricePlanMap =
    priceIdsNeedingLookup.length > 0
      ? await resolvePlanMap(priceIdsNeedingLookup)
      : {};

  let totalMonthlySubscriptions = 0;
  let totalAnnualSubscriptions = 0;

  for (const sub of activeSubs) {
    const plan =
      ["monthly", "annual", "daily"].includes(sub.plan)
        ? sub.plan
        : pricePlanMap[sub.stripePriceId];

    if (plan === "monthly") totalMonthlySubscriptions += 1;
    else if (plan === "annual") totalAnnualSubscriptions += 1;
  }

  return { totalMonthlySubscriptions, totalAnnualSubscriptions };
}

async function getSubscriptionsSoldPerMonth(year) {
  const startOfYear = new Date(year, 0, 1);
  const startOfNextYear = new Date(year + 1, 0, 1);

  const monthlyCounts = await Subscription.aggregate([
    {
      $match: {
        createdAt: { $gte: startOfYear, $lt: startOfNextYear },
      },
    },
    {
      $group: {
        _id: { $month: "$createdAt" },
        count: { $sum: 1 },
      },
    },
  ]);

  const countByMonth = Object.fromEntries(
    monthlyCounts.map((row) => [row._id, row.count])
  );

  return MONTH_LABELS.map((label, index) => ({
    month: index + 1,
    label,
    count: countByMonth[index + 1] || 0,
  }));
}

exports.getDashboard = async (req, res) => {
  try {
    const now = new Date();
    const requestedYear = parseInt(req.query.year, 10);
    const year =
      Number.isInteger(requestedYear) && requestedYear >= 2000 && requestedYear <= 2100
        ? requestedYear
        : now.getFullYear();

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [
      totalUsers,
      newSubscriptions,
      paymentStats,
      planTotals,
      subscriptionsSoldPerMonth,
    ] = await Promise.all([
      User.countDocuments(ACTIVE_USER_FILTER),
      Subscription.countDocuments({
        createdAt: { $gte: startOfMonth, $lt: startOfNextMonth },
      }),
      Payment.getPaymentStats({ status: "succeeded" }),
      getSubscriptionPlanTotals(),
      getSubscriptionsSoldPerMonth(year),
    ]);

    const amountCents = Math.max(
      0,
      (paymentStats.totalAmount || 0) - (paymentStats.refundedAmount || 0)
    );

    return res.status(200).json({
      success: true,
      data: {
        totalUsers,
        newSubscriptions,
        revenue: {
          amountCents,
          amountDollars: amountCents / 100,
          currency: "usd",
        },
        totalMonthlySubscriptions: planTotals.totalMonthlySubscriptions,
        totalAnnualSubscriptions: planTotals.totalAnnualSubscriptions,
        subscriptionsSoldPerMonth,
        meta: {
          year,
          newSubscriptionsPeriod: "current_month",
        },
      },
    });
  } catch (error) {
    console.error("Error getting admin dashboard:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get dashboard data",
      error: error.message,
    });
  }
};
