const cron = require("node-cron");
const {
  checkExpiredSubscriptions,
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
      timezone: "America/New_York", // Adjust timezone as needed
    }
  );

  // Alternative: Check expired subscriptions daily at midnight
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
      timezone: "America/New_York", // Adjust timezone as needed
    }
  );

  console.log("Scheduled tasks initialized successfully");
}

module.exports = {
  initializeScheduledTasks,
};
