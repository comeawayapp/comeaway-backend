/**
 * Reminder window: period end in [now + 1 day, now + 3 days).
 * Roughly "about 2 days before expiry" with a 48h catch window for a daily cron.
 */
function getTwoDayReminderWindow(now = new Date()) {
  const msDay = 24 * 60 * 60 * 1000;
  const windowStart = new Date(now.getTime() + 1 * msDay);
  const windowEnd = new Date(now.getTime() + 3 * msDay);
  return { windowStart, windowEnd };
}

function getPeriodEnd(subscription) {
  if (!subscription) return null;
  return subscription.currentPeriodEnd || subscription.endDate || null;
}

function sameInstant(a, b) {
  if (!a || !b) return false;
  return new Date(a).getTime() === new Date(b).getTime();
}

module.exports = {
  getTwoDayReminderWindow,
  getPeriodEnd,
  sameInstant,
};
