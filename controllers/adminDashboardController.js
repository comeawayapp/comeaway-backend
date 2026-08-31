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

function yearBounds(year) {
  const startOfYear = new Date(Date.UTC(year, 0, 1));
  const startOfNextYear = new Date(Date.UTC(year + 1, 0, 1));
  return { startOfYear, startOfNextYear };
}

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
    const plan = ["monthly", "annual", "daily"].includes(sub.plan)
      ? sub.plan
      : pricePlanMap[sub.stripePriceId];

    if (plan === "monthly") totalMonthlySubscriptions += 1;
    else if (plan === "annual") totalAnnualSubscriptions += 1;
  }

  return { totalMonthlySubscriptions, totalAnnualSubscriptions };
}

async function getSubscriptionsSoldPerMonth(year) {
  const { startOfYear, startOfNextYear } = yearBounds(year);

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

/**
 * Revenue for a calendar year.
 * Stripe amounts are stored in cents. Uses paidAt when set, else createdAt.
 */
async function getRevenueForYear(year) {
  const { startOfYear, startOfNextYear } = yearBounds(year);

  const result = await Payment.aggregate([
    { $match: { status: "succeeded" } },
    {
      $addFields: {
        effectivePaidAt: { $ifNull: ["$paidAt", "$createdAt"] },
      },
    },
    {
      $match: {
        effectivePaidAt: { $gte: startOfYear, $lt: startOfNextYear },
      },
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: "$amount" },
        refundedAmount: { $sum: { $ifNull: ["$refundedAmount", 0] } },
        paymentCount: { $sum: 1 },
      },
    },
  ]);

  const row = result[0] || {
    totalAmount: 0,
    refundedAmount: 0,
    paymentCount: 0,
  };

  const amountCents = Math.max(
    0,
    Math.round((row.totalAmount || 0) - (row.refundedAmount || 0))
  );

  return {
    amountCents,
    amountDollars: amountCents / 100,
    currency: "usd",
    paymentCount: row.paymentCount || 0,
  };
}

exports.getDashboard = async (req, res) => {
  try {
    const now = new Date();
    const requestedYear = parseInt(req.query.year, 10);
    const year =
      Number.isInteger(requestedYear) &&
      requestedYear >= 2000 &&
      requestedYear <= 2100
        ? requestedYear
        : now.getFullYear();

    const { startOfYear, startOfNextYear } = yearBounds(year);

    const usersInYearFilter = {
      $and: [
        ...ACTIVE_USER_FILTER.$and,
        { createdAt: { $gte: startOfYear, $lt: startOfNextYear } },
      ],
    };

    const [
      totalUsers,
      newSubscriptions,
      revenue,
      planTotals,
      subscriptionsSoldPerMonth,
    ] = await Promise.all([
      User.countDocuments(usersInYearFilter),
      Subscription.countDocuments({
        createdAt: { $gte: startOfYear, $lt: startOfNextYear },
      }),
      getRevenueForYear(year),
      getSubscriptionPlanTotals(),
      getSubscriptionsSoldPerMonth(year),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalUsers,
        newSubscriptions,
        revenue: {
          amountCents: revenue.amountCents,
          amountDollars: revenue.amountDollars,
          currency: revenue.currency,
        },
        totalMonthlySubscriptions: planTotals.totalMonthlySubscriptions,
        totalAnnualSubscriptions: planTotals.totalAnnualSubscriptions,
        subscriptionsSoldPerMonth,
        meta: {
          year,
          totalUsersPeriod: "selected_year",
          newSubscriptionsPeriod: "selected_year",
          revenuePeriod: "selected_year",
          planTotalsPeriod: "current_active",
          paymentCount: revenue.paymentCount,
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
