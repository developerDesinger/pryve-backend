const axios = require("axios");
require("dotenv").config();

/**
 * Postmark Email Service
 * Handles all email sending via Postmark API
 */
class PostmarkService {
  constructor() {
    this.apiUrl = "https://api.postmarkapp.com/email";
    this.serverToken = process.env.POSTMARK_SERVER_TOKEN;
    this.fromEmail = process.env.POSTMARK_FROM_EMAIL || "verify@pryve.ai";
    this.messageStream = process.env.POSTMARK_MESSAGE_STREAM || "outbound";
  }

  /**
   * Send email via Postmark API
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email address
   * @param {string} options.subject - Email subject
   * @param {string} options.html - HTML body content
   * @param {string} options.text - Plain text body content (optional)
   * @returns {Promise<Object>} - Response with messageId and other details
   */
  async sendEmail(options) {
    try {
      // Validate server token
      if (!this.serverToken) {
        throw new Error("POSTMARK_SERVER_TOKEN is not configured in environment variables");
      }

      // Validate required fields
      if (!options.to) {
        throw new Error("Recipient email (to) is required");
      }

      if (!options.subject) {
        throw new Error("Email subject is required");
      }

      if (!options.html) {
        throw new Error("HTML body is required");
      }

      console.log(`📧 [POSTMARK] Preparing email to: ${options.to}`);

      // Prepare payload according to Postmark API requirements
      const payload = {
        From: this.fromEmail,
        To: options.to,
        Subject: options.subject,
        HtmlBody: options.html,
        MessageStream: this.messageStream,
      };

      // Add text body if provided
      if (options.text) {
        payload.TextBody = options.text;
      }

      // Send email via Postmark API
      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Postmark-Server-Token": this.serverToken,
        },
      });

      console.log(`✅ [POSTMARK] Email sent successfully`);
      console.log(`📧 [POSTMARK] Message ID: ${response.data.MessageID}`);
      console.log(`📧 [POSTMARK] Submitted At: ${response.data.SubmittedAt}`);
      console.log(`📧 [POSTMARK] To: ${response.data.To}`);

      return {
        messageId: response.data.MessageID,
        submittedAt: response.data.SubmittedAt,
        to: response.data.To,
        success: true,
      };
    } catch (error) {
      console.error(`❌ [POSTMARK] Email sending failed:`, error.message);
      
      if (error.response) {
        console.error(`❌ [POSTMARK] Error code:`, error.response.status);
        console.error(`❌ [POSTMARK] Error details:`, JSON.stringify(error.response.data, null, 2));
        
        // Provide helpful error messages based on Postmark error codes
        if (error.response.status === 401) {
          throw new Error("Postmark authentication failed. Please check your server token.");
        } else if (error.response.status === 422) {
          const errorData = error.response.data;
          const errorCode = errorData?.ErrorCode;
          const errorMessage = errorData?.Message || error.message;
          
          // Handle account pending approval error (ErrorCode 412)
          if (errorCode === 412) {
            console.error(`⚠️ [POSTMARK] Account Pending Approval:`);
            console.error(`   Your Postmark account is pending approval.`);
            console.error(`   Until approved, you can only send emails to addresses on the same domain as your 'From' address (${this.fromEmail}).`);
            console.error(`   Action required: Contact Postmark support or check your Postmark dashboard to approve your account.`);
            throw new Error(`Postmark account pending approval: ${errorMessage}. Please contact Postmark support or check your dashboard to approve your account.`);
          }
          
          throw new Error(`Postmark validation error: ${errorMessage}`);
        } else if (error.response.status === 500) {
          throw new Error("Postmark server error. Please try again later.");
        }
      }
      
      throw new Error(`Postmark email failed: ${error.message}`);
    }
  }

  /**
   * Send OTP verification email
   * @param {Object} options - Email options
   * @param {string} options.email - Recipient email address
   * @param {string} options.otp - OTP code
   * @param {string} options.subject - Email subject (optional)
   * @returns {Promise<Object>} - Response with messageId
   */
  async sendOTPEmail(options) {
    const { email, otp, subject } = options;

    // Default subject if not provided
    const emailSubject = subject || "Your Pryve verification code";

    // Plain text version
    const textBody = `Your code is ${otp}. It expires in 5 minutes.`;

    // HTML version (matching client's requirements)
    const htmlBody = `Your code is ${otp}. It expires in 5 minutes.`;

    return await this.sendEmail({
      to: email,
      subject: emailSubject,
      html: htmlBody,
      text: textBody,
    });
  }
}

module.exports = new PostmarkService();

