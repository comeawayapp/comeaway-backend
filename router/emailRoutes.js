const express = require("express");
const router = express.Router();
const emailService = require("../services/emailService");
const emailLogger = require("../utils/emailLogger");
const authMiddleware = require("../middleware/auth");

// Get email statistics (admin only)
router.get("/stats", authMiddleware, async (req, res) => {
  try {
    // You might want to add admin role check here
    const hours = parseInt(req.query.hours) || 24;
    const stats = await emailLogger.getEmailStats(hours);

    res.status(200).json({
      success: true,
      data: stats,
      period: `${hours} hours`,
    });
  } catch (error) {
    console.error("Error getting email stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get email statistics",
      error: error.message,
    });
  }
});

// Send test email (admin only)
router.post("/test", authMiddleware, async (req, res) => {
  try {
    const { to, subject, message } = req.body;

    if (!to || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "to, subject, and message are required",
      });
    }

    const result = await emailService.sendEmail({
      to,
      subject: `[TEST] ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>🧪 Test Email</h2>
          <p>${message}</p>
          <hr>
          <p><small>This is a test email sent from Comeaway admin panel at ${new Date().toISOString()}</small></p>
        </div>
      `,
      text: `TEST EMAIL\n\n${message}\n\nThis is a test email sent from Comeaway admin panel at ${new Date().toISOString()}`,
    });

    res.status(200).json({
      success: result.success,
      message:
        result.success ?
          "Test email sent successfully"
        : "Failed to send test email",
      data: result,
    });
  } catch (error) {
    console.error("Error sending test email:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send test email",
      error: error.message,
    });
  }
});

// Clean old email logs (admin only)
router.post("/cleanup", authMiddleware, async (req, res) => {
  try {
    const days = parseInt(req.body.days) || 30;
    await emailLogger.cleanOldLogs(days);

    res.status(200).json({
      success: true,
      message: `Successfully cleaned logs older than ${days} days`,
    });
  } catch (error) {
    console.error("Error cleaning logs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to clean email logs",
      error: error.message,
    });
  }
});

// Send admin notification
router.post("/admin-notification", authMiddleware, async (req, res) => {
  try {
    const { subject, message, data } = req.body;

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: "subject and message are required",
      });
    }

    const result = await emailService.sendAdminNotification(
      subject,
      message,
      data
    );

    res.status(200).json({
      success: result.success,
      message:
        result.success ?
          "Admin notification sent successfully"
        : "Failed to send admin notification",
      data: result,
    });
  } catch (error) {
    console.error("Error sending admin notification:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send admin notification",
      error: error.message,
    });
  }
});

module.exports = router;
