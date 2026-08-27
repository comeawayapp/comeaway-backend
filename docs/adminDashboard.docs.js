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
 *       Pie chart uses totalMonthlySubscriptions and totalAnnualSubscriptions.
 *       Bar chart uses subscriptionsSoldPerMonth (12 months for the selected year).
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *           example: 2026
 *         description: Calendar year for the subscriptions-sold-per-month bar chart (defaults to current year)
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
 *                       example: 120
 *                     newSubscriptions:
 *                       type: integer
 *                       description: Subscriptions created in the current calendar month
 *                       example: 8
 *                     revenue:
 *                       type: object
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
 *                       description: Active/trialing monthly subscriptions (pie chart)
 *                       example: 34
 *                     totalAnnualSubscriptions:
 *                       type: integer
 *                       description: Active/trialing annual subscriptions (pie chart)
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
 *                         newSubscriptionsPeriod:
 *                           type: string
 *                           example: current_month
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — owner or admin role required
 *       500:
 *         description: Server error
 */
