const { Resend } = require("resend");
const emailConfig = require("../config/emailConfig");
const emailLogger = require("../utils/emailLogger");

class EmailService {
  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.config = emailConfig;
    this.logger = emailLogger;
    this.defaultFromEmail = this.config.defaultSender.email;
    this.retryAttempts = this.config.retry.attempts;
    this.retryDelay = this.config.retry.baseDelay;
  }

  /**
   * Validate email address
   * @param {string} email - Email address to validate
   * @returns {boolean} - True if valid, false otherwise
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate required email parameters
   * @param {Object} params - Email parameters
   * @param {string} params.to - Recipient email
   * @param {string} params.subject - Email subject
   * @param {string} params.html - Email HTML content
   * @returns {Object} - Validation result
   */
  validateEmailParams({ to, subject, html, text }) {
    const errors = [];

    if (!to) {
      errors.push("Recipient email (to) is required");
    } else if (!this.isValidEmail(to)) {
      errors.push("Invalid recipient email format");
    }

    if (!subject || subject.trim().length === 0) {
      errors.push("Subject is required");
    }

    if (!html && !text) {
      errors.push("Either HTML or text content is required");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Sleep function for retry delays
   * @param {number} ms - Milliseconds to sleep
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Send email with retry logic
   * @param {Object} emailData - Email configuration
   * @param {string} emailData.to - Recipient email
   * @param {string} emailData.subject - Email subject
   * @param {string} emailData.html - Email HTML content
   * @param {string} [emailData.text] - Email plain text content
   * @param {string} [emailData.from] - Sender email (optional)
   * @param {Array} [emailData.attachments] - Email attachments (optional)
   * @param {number} [attempt=1] - Current attempt number
   * @returns {Promise<Object>} - Success/failure result
   */
  async sendEmail(emailData, attempt = 1) {
    try {
      // Validate input parameters
      const validation = this.validateEmailParams(emailData);
      if (!validation.isValid) {
        throw new Error(
          `Email validation failed: ${validation.errors.join(", ")}`
        );
      }

      const { to, subject, html, text, from, attachments, cc, bcc, replyTo } =
        emailData;

      // Prepare email payload
      const emailPayload = {
        from: from || this.defaultFromEmail,
        to: Array.isArray(to) ? to : [to],
        subject: subject.trim(),
        ...(html && { html }),
        ...(text && { text }),
        ...(cc && { cc: Array.isArray(cc) ? cc : [cc] }),
        ...(bcc && { bcc: Array.isArray(bcc) ? bcc : [bcc] }),
        ...(replyTo && { replyTo }),
        ...(attachments && { attachments }),
      };

      console.log(
        `[EmailService] Sending email attempt ${attempt}/${this.retryAttempts} to: ${to}`
      );
      console.log(`[EmailService] Email payload:`, {
        from: emailPayload.from,
        to: emailPayload.to,
        subject: emailPayload.subject,
      });

      // Send email using Resend
      const result = await this.resend.emails.send(emailPayload);

      console.log(`[EmailService] Full Resend response:`, result);

      // Check if Resend returned an error (some errors don't throw)
      if (result.error) {
        throw new Error(
          `Resend API Error: ${result.error.message || JSON.stringify(result.error)}`
        );
      }

      console.log(`[EmailService] Email sent successfully to: ${to}`, {
        id: result.data?.id,
        attempt,
        resendResponse: result,
      });

      // Log successful email
      this.logger.logEmailSent(emailData, result).catch((logError) => {
        console.error("Failed to log email success:", logError);
      });

      return {
        success: true,
        data: result.data,
        attempt,
        message: "Email sent successfully",
      };
    } catch (error) {
      console.error(`[EmailService] Email send attempt ${attempt} failed:`, {
        error: error.message,
        to: emailData.to,
        subject: emailData.subject,
      });

      // Retry logic for transient errors
      if (attempt < this.retryAttempts && this.shouldRetry(error)) {
        console.log(
          `[EmailService] Retrying email send in ${this.retryDelay}ms...`
        );
        await this.sleep(this.retryDelay * attempt); // Exponential backoff
        return this.sendEmail(emailData, attempt + 1);
      }

      // Final failure
      console.error(
        `[EmailService] Email send failed after ${attempt} attempts:`,
        error.message
      );

      const errorResult = {
        success: false,
        error: error.message,
        attempt,
        originalError: error,
      };

      // Log email error
      this.logger.logEmailError(emailData, errorResult).catch((logError) => {
        console.error("Failed to log email error:", logError);
      });

      return errorResult;
    }
  }

  /**
   * Determine if error should trigger a retry
   * @param {Error} error - The error that occurred
   * @returns {boolean} - True if should retry
   */
  shouldRetry(error) {
    const retryableErrors = [
      "rate_limit_exceeded",
      "timeout",
      "network",
      "temporary",
      "ECONNRESET",
      "ENOTFOUND",
      "ECONNREFUSED",
    ];

    const errorMessage = error.message.toLowerCase();
    const errorCode = error.code?.toLowerCase();

    return retryableErrors.some(
      (retryableError) =>
        errorMessage.includes(retryableError) || errorCode === retryableError
    );
  }

  /**
   * Send OTP email for password reset
   * @param {string} email - Recipient email
   * @param {string|number} otp - OTP code
   * @param {number} [expiryMinutes=15] - OTP expiry in minutes
   * @returns {Promise<Object>} - Send result
   */
  async sendPasswordResetOTP(email, otp, expiryMinutes = 15) {
    const subject = "Password Reset OTP - Comeaway";
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset OTP</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .container { background: #f9f9f9; padding: 30px; border-radius: 10px; }
            .header { text-align: center; margin-bottom: 30px; }
            .otp-code { background: #007bff; color: white; font-size: 24px; font-weight: bold; padding: 15px 30px; border-radius: 5px; display: inline-block; letter-spacing: 3px; margin: 20px 0; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            
            <p>Hello,</p>
            
            <p>You have requested to reset your password for your Comeaway account. Please use the following OTP (One-Time Password) to proceed:</p>
            
            <div style="text-align: center;">
              <div class="otp-code">${otp}</div>
            </div>
            
            <div class="warning">
              <strong>Important:</strong>
              <ul>
                <li>This OTP is valid for ${expiryMinutes} minutes only</li>
                <li>Do not share this OTP with anyone</li>
                <li>If you didn't request this reset, please ignore this email</li>
              </ul>
            </div>
            
            <p>If you're having trouble, please <a href="mailto:support@comeaway.com">contact our support team</a>.</p>
            
            <div class="footer">
              <p>Best regards,<br>Comeaway Team</p>
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Password Reset Request

Hello,

You have requested to reset your password for your Comeaway account.

Your OTP: ${otp}

This OTP is valid for ${expiryMinutes} minutes only.
Do not share this OTP with anyone.
If you didn't request this reset, please ignore this email.

If you're having trouble, contact our support team: support@comeaway.com

Best regards,
Comeaway Team
    `;

    return this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  /**
   * Send welcome email to new users
   * @param {string} email - Recipient email
   * @param {string} firstName - User's first name
   * @returns {Promise<Object>} - Send result
   */
  async sendWelcomeEmail(email, firstName) {
    const subject = "Welcome to Comeaway! 🎵";
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Comeaway</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .container { background: #f9f9f9; padding: 30px; border-radius: 10px; }
            .header { text-align: center; margin-bottom: 30px; }
            .highlight { color: #007bff; font-weight: bold; }
            .feature-list { background: #f1f7ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .btn { background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; font-size: 16px; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to <span class="highlight">Comeaway</span>! 🎵</h1>
              <p>Hello <span class="highlight">${firstName}</span>,</p>
            </div>
            <p>We're thrilled to have you join our audio community. Your journey to discovering, creating, and enjoying amazing audio content starts now!</p>
            <div class="feature-list">
              <h2>What you can do on Comeaway:</h2>
              <ul>
                <li>🎧 Discover trending and exclusive audio content</li>
                <li>📝 Create and manage your own playlists</li>
                <li>⭐ Rate and review your favorite sounds</li>
                <li>🔔 Get notified about new releases and features</li>
                <li>💎 Access premium content with a Pro subscription</li>
              </ul>
            </div>
            <p>Ready to start exploring? Click below to dive in:</p>
            <a href="https://comeaway.com/app" class="btn">Start Exploring</a>
            <div class="footer">
              <p>Need help? <a href="mailto:support@comeaway.com">Contact our support team</a>.</p>
              <p>Happy listening!<br>The Comeaway Team</p>
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Welcome to Comeaway!

Hello ${firstName},

We're thrilled to have you join our audio community. Your journey to discovering, creating, and enjoying amazing audio content starts now!

What you can do on Comeaway:
- Discover trending and exclusive audio content
- Create and manage your own playlists
- Rate and review your favorite sounds
- Get notified about new releases and features
- Access premium content with a Pro subscription

Ready to start exploring? Visit https://comeaway.com/app

Need help? Contact our support team: support@comeaway.com

Happy listening!
The Comeaway Team
(This is an automated email. Please do not reply.)
    `;

    return this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  /**
   * Send subscription confirmation email
   * @param {string} email - Recipient email
   * @param {string} firstName - User's first name
   * @param {string} plan - Subscription plan (monthly/annual)
   * @param {Date} expiryDate - Subscription expiry date
   * @returns {Promise<Object>} - Send result
   */
  async sendSubscriptionConfirmation(email, firstName, plan, expiryDate) {
    const formattedDate = new Date(expiryDate).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const subject = "🎉 Comeaway Pro Subscription Activated!";
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Pro Subscription Activated</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .container { background: #f8f9fa; padding: 30px; border-radius: 10px; }
            .header { background: linear-gradient(135deg, #28a745, #20c997); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px; }
            .plan-details { background: white; padding: 20px; border-radius: 5px; border-left: 4px solid #28a745; margin: 20px 0; }
            .benefits { background: #e8f5e8; padding: 20px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to Comeaway Pro!</h1>
              <p>Your subscription is now active</p>
            </div>
            
            <p>Hello ${firstName},</p>
            
            <p>Congratulations! Your Comeaway Pro subscription has been successfully activated.</p>
            
            <div class="plan-details">
              <h3>📋 Subscription Details:</h3>
              <ul>
                <li><strong>Plan:</strong> ${plan.charAt(0).toUpperCase() + plan.slice(1)} Pro</li>
                <li><strong>Status:</strong> Active</li>
                <li><strong>Expires:</strong> ${formattedDate}</li>
              </ul>
            </div>
            
            <div class="benefits">
              <h3>🌟 Your Pro Benefits:</h3>
              <ul>
                <li>✅ Access to all premium audio content</li>
                <li>✅ Unlimited playlist creation</li>
                <li>✅ High-quality audio streaming</li>
                <li>✅ Ad-free listening experience</li>
                <li>✅ Priority customer support</li>
                <li>✅ Early access to new features</li>
              </ul>
            </div>
            
            <p>Thank you for choosing Comeaway Pro. We hope you enjoy your premium experience!</p>
            
            <p>Best regards,<br>The Comeaway Team</p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject,
      html,
    });
  }

  /**
   * Send activation code email
   * @param {string} email - Recipient email
   * @param {string} customerName - Customer name
   * @param {string} activationCode - 6-digit activation code
   * @param {string} productName - Product name
   * @param {Date} expiryDate - Code expiry date
   * @returns {Promise<Object>} - Send result
   */
  async sendActivationCode(
    email,
    customerName,
    activationCode,
    productName,
    expiryDate
  ) {
    const formattedDate = new Date(expiryDate).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const subject = "Your Comeaway Activation Code";
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Activation Code</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .container { background: #f9f9f9; padding: 30px; border-radius: 10px; }
            .code-section { background: white; padding: 30px; border-radius: 10px; text-align: center; margin: 20px 0; border: 2px dashed #007bff; }
            .activation-code { font-size: 36px; font-weight: bold; color: #007bff; letter-spacing: 8px; margin: 20px 0; }
            .instructions { background: #e3f2fd; padding: 20px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🎵 Your Comeaway Activation Code</h1>
            
            <p>Hello ${customerName},</p>
            
            <p>Thank you for your purchase! Here is your activation code for <strong>${productName}</strong>:</p>
            
            <div class="code-section">
              <h2>Activation Code</h2>
              <div class="activation-code">${activationCode}</div>
              <p><strong>Expires:</strong> ${formattedDate}</p>
            </div>
            
            <div class="instructions">
              <h3>📱 How to redeem:</h3>
              <ol>
                <li>Open the Comeaway app</li>
                <li>Go to Settings → Activation Codes</li>
                <li>Enter the code above</li>
                <li>Enjoy your premium access!</li>
              </ol>
            </div>
            
            <p><strong>Important:</strong> This code must be redeemed before ${formattedDate}. After this date, the code will expire and cannot be used.</p>
            
            <p>If you have any issues redeeming your code, please <a href="mailto:support@comeaway.com">contact our support team</a>.</p>
            
            <p>Thank you for choosing Comeaway!</p>
            
            <p>Best regards,<br>The Comeaway Team</p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject,
      html,
    });
  }

  /**
   * Send multiple activation codes in one email
   * @param {string} email - Recipient email
   * @param {string} customerName - Customer name
   * @param {Array} activationCodes - Array of activation code objects
   * @param {string} productName - Product name
   * @returns {Promise<Object>} - Send result
   */
  async sendMultipleActivationCodes(
    email,
    customerName,
    activationCodes,
    productName
  ) {
    const subject = "Your Comeaway Activation Codes";
    
    // Generate HTML table for multiple codes
    const tableRows = activationCodes.map(code => {
      const formattedDate = new Date(code.expiresIn).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      
      return `
        <tr style="border-bottom: 1px solid #e0e0e0;">
          <td style="padding: 12px; font-size: 18px; font-weight: bold; color: #007bff; letter-spacing: 2px;">${code.code}</td>
          <td style="padding: 12px; color: #333;">${code.productName}</td>
          <td style="padding: 12px; color: #333;">${code.platform}</td>
          <td style="padding: 12px; color: #666;">${formattedDate}</td>
        </tr>
      `;
    }).join('');

    const codesHtml = `
      <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <thead>
          <tr style="background: #f8f9fa;">
            <th style="padding: 15px; text-align: left; color: #333; font-weight: 600; border-bottom: 2px solid #dee2e6;">Code</th>
            <th style="padding: 15px; text-align: left; color: #333; font-weight: 600; border-bottom: 2px solid #dee2e6;">Product</th>
            <th style="padding: 15px; text-align: left; color: #333; font-weight: 600; border-bottom: 2px solid #dee2e6;">Platform</th>
            <th style="padding: 15px; text-align: left; color: #333; font-weight: 600; border-bottom: 2px solid #dee2e6;">Expires</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    `;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Multiple Activation Codes</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .container { background: #f9f9f9; padding: 30px; border-radius: 10px; }
            .header { text-align: center; margin-bottom: 30px; }
            .instructions { background: #e3f2fd; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .codes-container { margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎵 Your Comeaway Activation Codes</h1>
            </div>
            
            <p>Hello ${customerName},</p>
            
            <p>Here are your activation codes for <strong>${productName}</strong>:</p>
            
            <div class="codes-container" style="text-align: center; margin: 20px 0;">
              ${codesHtml}
            </div>
            
            <div class="instructions">
            
            <p><strong>Important:</strong> Each code can only be used once. Use them before they expire.</p>
            
            <p>If you have any issues redeeming your codes, please <a href="mailto:support@comeaway.com">contact our support team</a>.</p>
            
            <p>Thank you for choosing Comeaway!</p>
            
            <p>Best regards,<br>The Comeaway Team</p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject,
      html,
    });
  }

  /**
   * Send notification email to admin
   * @param {string} subject - Email subject
   * @param {string} message - Email message
   * @param {Object} [data] - Additional data to include
   * @returns {Promise<Object>} - Send result
   */
  async sendAdminNotification(subject, message, data = {}) {
    const adminEmail = process.env.ADMIN_EMAIL || "admin@comeaway.com";

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Admin Notification</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .alert { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .data { background: #f8f9fa; padding: 15px; border-radius: 5px; font-family: monospace; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🔔 Admin Notification</h1>
            
            <div class="alert">
              <h2>${subject}</h2>
              <p>${message}</p>
            </div>
            
            ${
              Object.keys(data).length > 0 ?
                `
              <h3>Additional Data:</h3>
              <div class="data">
                <pre>${JSON.stringify(data, null, 2)}</pre>
              </div>
            `
              : ""
            }
            
            <p><small>Generated at: ${new Date().toISOString()}</small></p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: adminEmail,
      subject: `[Comeaway Admin] ${subject}`,
      html,
    });
  }

  /**
   * Send account deletion request OTP
   * @param {string} email - Recipient email
   * @param {string} firstName - User's first name
   * @param {string} otp - 4-digit OTP
   * @returns {Promise<Object>} - Send result
   */
  async sendDeletionRequestOTP(email, firstName, otp) {
    const subject = "Account Deletion Request - Comeaway ⚠️";
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Deletion Request - Comeaway</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .container { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%); color: white; padding: 40px; border-radius: 15px; text-align: center; }
            .content { background: white; color: #333; padding: 30px; border-radius: 10px; margin: 20px 0; }
            .otp-box { background: #f8f9fa; border: 2px dashed #dc3545; padding: 20px; border-radius: 10px; margin: 20px 0; }
            .otp-code { font-size: 32px; font-weight: bold; color: #dc3545; letter-spacing: 5px; }
            .warning { background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; color: #721c24; }
            .important { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; color: #856404; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>⚠️ Account Deletion Request</h1>
            <p>Hello ${firstName}!</p>
            
            <div class="content">
              <h2>Confirm Your Account Deletion</h2>
              
              <div class="warning">
                <strong>⚠️ Important:</strong>
                <p>You have requested to delete your Comeaway account. This action will permanently remove all your data including:</p>
                <ul style="text-align: left; margin: 10px 0;">
                  <li>🎵 All your playlists and favorites</li>
                  <li>⭐ Your ratings and reviews</li>
                  <li>📱 Account settings and preferences</li>
                  <li>💳 Subscription information</li>
                  <li>📊 Usage history and statistics</li>
                </ul>
              </div>
              
              <p>To confirm this deletion, please use the verification code below:</p>
              
              <div class="otp-box">
                <p style="margin: 0; font-size: 18px;">Your Deletion Confirmation Code:</p>
                <div class="otp-code">${otp}</div>
              </div>
              
              <div class="important">
                <strong>🔒 Security Notice:</strong>
                <ul style="text-align: left; margin: 10px 0;">
                  <li>This code will expire in <strong>15 minutes</strong></li>
                  <li>Do not share this code with anyone</li>
                  <li>This action cannot be undone once confirmed</li>
                  <li>If you didn't request this deletion, please ignore this email</li>
                </ul>
              </div>
              
              <p style="margin-top: 30px;">
                <strong>Need help?</strong> If you have any questions or need assistance, please <a href="mailto:support@comeaway.com">contact our support team</a> before proceeding.
              </p>
            </div>
            
            <p style="font-size: 14px; opacity: 0.8;">
              This is an automated message from Comeaway.<br>
              Please do not reply to this email.
            </p>
          </div>
        </body>
      </html>
    `;

    const text = `
Account Deletion Request - Comeaway

Hello ${firstName}!

You have requested to delete your Comeaway account. This action will permanently remove all your data including:
- All your playlists and favorites
- Your ratings and reviews
- Account settings and preferences
- Subscription information
- Usage history and statistics

To confirm this deletion, please use the verification code below:

Your Deletion Confirmation Code: ${otp}

This code will expire in 15 minutes. Do not share this code with anyone.
This action cannot be undone once confirmed.

If you didn't request this deletion, please ignore this email.

Need help? Contact our support team: support@comeaway.com

Thank you,
Comeaway Team
    `;

    return this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  /**
   * Send email verification OTP
   * @param {string} email - Recipient email
   * @param {string} firstName - User's first name
   * @param {string} otp - 4-digit OTP
   * @returns {Promise<Object>} - Send result
   */
  async sendVerificationOTP(email, firstName, otp) {
    const subject = "Verify Your Email - Comeaway 🔐";
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification - Comeaway</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .container { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; border-radius: 15px; text-align: center; }
            .content { background: white; color: #333; padding: 30px; border-radius: 10px; margin: 20px 0; }
            .otp-box { background: #f8f9fa; border: 2px dashed #007bff; padding: 20px; border-radius: 10px; margin: 20px 0; }
            .otp-code { font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 5px; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🔐 Email Verification</h1>
            <p>Hello ${firstName}!</p>
            
            <div class="content">
              <h2>Please verify your email address</h2>
              
              <p>Thank you for signing up with Comeaway! To complete your registration, please use the verification code below:</p>
              
              <div class="otp-box">
                <p style="margin: 0; font-size: 18px;">Your Verification Code:</p>
                <div class="otp-code">${otp}</div>
              </div>
              
              <div class="warning">
                <strong>⚠️ Important:</strong>
                <ul style="text-align: left; margin: 10px 0;">
                  <li>This code will expire in <strong>15 minutes</strong></li>
                  <li>Do not share this code with anyone</li>
                  <li>If you didn't request this verification, please ignore this email</li>
                </ul>
              </div>
              
              <p>Once verified, you'll be able to:</p>
              <ul style="text-align: left;">
                <li>🎧 Access your personalized audio content</li>
                <li>📱 Create and manage playlists</li>
                <li>⭐ Rate and review sounds</li>
                <li>🔔 Receive updates about new content</li>
              </ul>
              
              <p style="margin-top: 30px;">
                <small>If you're having trouble with verification, please <a href="mailto:support@comeaway.com">contact our support team</a>.</small>
              </p>
            </div>
            
            <p style="font-size: 14px; opacity: 0.8;">
              This is an automated message from Comeaway.<br>
              Please do not reply to this email.
            </p>
          </div>
        </body>
      </html>
    `;

    const text = `
Hello ${firstName}!

Please verify your email address for Comeaway.

Your Verification Code: ${otp}

This code will expire in 15 minutes. Do not share this code with anyone.

If you're having trouble with verification, contact our support team: support@comeaway.com

If you didn't request this verification, please ignore this email.

Thank you,
Comeaway Team
    `;

    return this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }
}

// Export singleton instance
const emailService = new EmailService();
module.exports = emailService;
