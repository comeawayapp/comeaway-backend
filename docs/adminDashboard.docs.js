/**
 * @swagger
 * tags:
 *   name: Admin Dashboard
 *   description: Aggregated metrics for the staff admin dashboard
 */

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Get admin dashboard metrics
 *     description: >
 *       Returns KPI cards and chart data for the admin dashboard.
 *       `year` filters totalUsers, newSubscriptions, revenue, and subscriptionsSoldPerMonth.
 *       Pie chart (active monthly vs annual subscriptions) is always current snapshot.
 *       Payment amounts are treated as Stripe cents (299 = $2.99).
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *           example: 2026
 *         description: Calendar year for year-scoped KPIs and the bar chart (defaults to current year)
 *     responses:
 *       200:
 *         description: Dashboard metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalUsers:
 *                       type: integer
 *                       description: Active users created in the selected year
 *                       example: 120
 *                     newSubscriptions:
 *                       type: integer
 *                       description: Subscriptions created in the selected year
 *                       example: 8
 *                     revenue:
 *                       type: object
 *                       description: Net succeeded payments in the selected year (Stripe cents)
 *                       properties:
 *                         amountCents:
 *                           type: number
 *                           example: 500000
 *                         amountDollars:
 *                           type: number
 *                           example: 5000
 *                         currency:
 *                           type: string
 *                           example: usd
 *                     totalMonthlySubscriptions:
 *                       type: integer
 *                       description: Active/trialing monthly subscriptions right now (pie chart)
 *                       example: 34
 *                     totalAnnualSubscriptions:
 *                       type: integer
 *                       description: Active/trialing annual subscriptions right now (pie chart)
 *                       example: 12
 *                     subscriptionsSoldPerMonth:
 *                       type: array
 *                       description: Subscriptions created per month for the selected year (bar chart)
 *                       items:
 *                         type: object
 *                         properties:
 *                           month:
 *                             type: integer
 *                             minimum: 1
 *                             maximum: 12
 *                           label:
 *                             type: string
 *                             example: January
 *                           count:
 *                             type: integer
 *                             example: 3
 *                     meta:
 *                       type: object
 *                       properties:
 *                         year:
 *                           type: integer
 *                           example: 2026
 *                         totalUsersPeriod:
 *                           type: string
 *                           example: selected_year
 *                         newSubscriptionsPeriod:
 *                           type: string
 *                           example: selected_year
 *                         revenuePeriod:
 *                           type: string
 *                           example: selected_year
 *                         planTotalsPeriod:
 *                           type: string
 *                           example: current_active
 *                         paymentCount:
 *                           type: integer
 *                           description: Number of succeeded payments included in revenue for the year
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — owner or admin role required
 *       500:
 *         description: Server error
 */
