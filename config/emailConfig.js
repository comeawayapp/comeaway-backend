/**
 * Email Service Configuration
 * Customize your email settings and templates here
 */

module.exports = {
  // Default sender configuration
  defaultSender: {
    email: "support@comeaway.com", // Using verified domain from Resend
    name: "Comeaway Team",
  },

  // Admin email for notifications
  adminEmail: process.env.ADMIN_EMAIL || "support@comeaway.com",

  // Retry configuration
  retry: {
    attempts: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
  },

  // OTP configuration
  otp: {
    expiryMinutes: 15,
    length: 4,
  },

  // Email templates configuration
  templates: {
    passwordReset: {
      subject: "Password Reset OTP - Comeaway",
      expiryMinutes: 15,
    },
    emailVerification: {
      subject: "Verify Your Email - Comeaway 🔐",
      expiryMinutes: 15,
    },
    welcome: {
      subject: "Welcome to Comeaway! 🎵",
    },
    subscriptionConfirmation: {
      subject: "🎉 Comeaway Pro Subscription Activated!",
    },
    activationCode: {
      subject: "Your Comeaway Activation Code",
    },
    adminNotification: {
      subjectPrefix: "[Comeaway Admin]",
    },
  },

  // Feature flags
  features: {
    enableWelcomeEmail: true,
    enableEmailVerification: true,
    enableSubscriptionEmails: true,
    enableActivationCodeEmails: true,
    enableAdminNotifications: true,
    enableRetry: true,
  },

  // Rate limiting (optional for future implementation)
  rateLimiting: {
    maxEmailsPerMinute: 10,
    maxEmailsPerHour: 100,
  },
};
