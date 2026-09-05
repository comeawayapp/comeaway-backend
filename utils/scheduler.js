const cron = require("node-cron");
const {
  checkExpiredSubscriptions,
  sendTwoDayExpiryReminders,
} = require("../controllers/subscriptionController");

/**
 * Initialize scheduled tasks
 */
function initializeScheduledTasks() {
  console.log("Initializing scheduled tasks...");

  // Check for expired subscriptions every hour
  cron.schedule(
    "0 * * * *",
    async () => {
      console.log("Running scheduled task: Check expired subscriptions");
      try {
        const expiredCount = await checkExpiredSubscriptions();
        console.log(
          `Scheduled task completed: ${expiredCount} subscriptions processed`
        );
      } catch (error) {
        console.error(
          "Error in scheduled task - check expired subscriptions:",
          error
        );
      }
    },
    {
      scheduled: true,
      timezone: "America/New_York",
    }
  );

  // Check expired subscriptions daily at midnight
  cron.schedule(
    "0 0 * * *",
    async () => {
      console.log("Running daily task: Check expired subscriptions");
      try {
        const expiredCount = await checkExpiredSubscriptions();
        console.log(
          `Daily task completed: ${expiredCount} subscriptions expired`
        );
      } catch (error) {
        console.error(
          "Error in daily task - check expired subscriptions:",
          error
        );
      }
    },
    {
      scheduled: true,
      timezone: "America/New_York",
    }
  );

  // 2-day expiry reminder emails (Subscription table only)
  // Window used by scanner: [now+1d, now+3d)
  cron.schedule(
    "0 9 * * *",
    async () => {
      console.log(
        "Running daily task: Send 2-day subscription expiry reminders"
      );
      try {
        const result = await sendTwoDayExpiryReminders();
        console.log(
          `Daily reminder task completed: sent=${result.sent} skipped=${result.skipped} scanned=${result.scanned}`
        );
      } catch (error) {
        console.error("Error in daily task - send expiry reminders:", error);
      }
    },
    {
      scheduled: true,
      timezone: "America/New_York",
    }
  );

  console.log("Scheduled tasks initialized successfully");
}

module.exports = {
  initializeScheduledTasks,
};
