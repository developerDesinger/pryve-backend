const nodemailer = require("nodemailer");
require("dotenv").config();
const { logStatusCheckInstructions } = require("./emailStatus");

// Create Office365 SMTP transporter
const createTransporter = () => {
  const config = {
    host: "smtp.office365.com",
    port: 587,
    secure: false, // STARTTLS
    auth: {
      user: process.env.SMTP_USERNAME,
      pass: process.env.SMTP_PASSWORD
    },
    requireTLS: true,
    name: "mail.pryvegroup.com"
  };

  console.log(`🔧 [OFFICE365] Creating transporter with config:`, {
    host: config.host,
    port: config.port,
    secure: config.secure,
    username: config.auth.user,
    hasPassword: !!config.auth.pass
  });

  return nodemailer.createTransport(config);
};

// Send email using Office365
const sendEmailWithOffice365 = async (mailOptions) => {
  try {
    const transporter = createTransporter();
    
    // Verify connection
    console.log(`🔍 [OFFICE365] Verifying connection...`);
    await transporter.verify();
    console.log(`✅ [OFFICE365] Connection verified successfully`);
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ [OFFICE365] Email sent successfully`);
    console.log(`📧 [OFFICE365] Message ID: ${info.messageId}`);
    console.log(`📧 [OFFICE365] Response: ${info.response}`);
    
    // Check if email was accepted by server
    if (info.response && info.response.includes('250')) {
      console.log(`✅ [OFFICE365] Email accepted by server`);
      // Log status check instructions if recipient email is available
      if (mailOptions.to) {
        logStatusCheckInstructions(info.messageId, mailOptions.to);
      }
      console.log(`⚠️ [OFFICE365] IMPORTANT: If recipient doesn't receive email:`);
      console.log(`   1. Check spam/junk folder`);
      console.log(`   2. Check Office365 message trace using Message ID above`);
      console.log(`   3. Verify email address is correct (no typos)`);
      console.log(`   4. Wait 5-15 minutes for delivery`);
    } else {
      console.warn(`⚠️ [OFFICE365] Unexpected server response: ${info.response}`);
    }
    
    // Return info with messageId for tracking
    return {
      ...info,
      messageId: info.messageId,
      canCheckStatus: true,
      checkStatusCommand: `node check-email-status.js "${info.messageId}"`
    };
    
  } catch (error) {
    console.error(`❌ [OFFICE365] Email sending failed:`, error.message);
    console.error(`❌ [OFFICE365] Error code:`, error.code);
    console.error(`❌ [OFFICE365] Error command:`, error.command);
    if (error.response) {
      console.error(`❌ [OFFICE365] Server response:`, error.response);
    }
    throw new Error(`Office365 email failed: ${error.message}`);
  }
};

// Simple email validation
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const sendEmail = async (options) => {
  console.log(`📧 [SEND EMAIL] Starting email send process...`);
  console.log(`📧 [SEND EMAIL] Options received:`, {
    email: options.email,
    subject: options.subject,
    hasOTP: !!options.otp
  });

  // Validate recipient email
  if (!options.email) {
    console.error("❌ [SEND EMAIL] Error: Recipient email is missing.");
    throw new Error("Recipient email is required");
  }

  // Validate email format
  if (!isValidEmail(options.email)) {
    console.error(`❌ [SEND EMAIL] Error: Invalid email format: ${options.email}`);
    throw new Error(`Invalid email format: ${options.email}`);
  }

  // Warn about common typos
  const emailLower = options.email.toLowerCase();
  const commonTypos = {
    'gmail.co': 'gmail.com',
    'gmial.com': 'gmail.com',
    'gmai.com': 'gmail.com',
    'yaho.com': 'yahoo.com',
    'outlok.com': 'outlook.com',
  };
  
  for (const [typo, correct] of Object.entries(commonTypos)) {
    if (emailLower.includes(typo)) {
      console.warn(`⚠️ [SEND EMAIL] Possible typo detected: ${options.email} (did you mean ${options.email.replace(typo, correct)}?)`);
    }
  }

  // Validate OTP
  if (!options.otp) {
    console.error("❌ [SEND EMAIL] Error: No OTP provided.");
    return;
  }

  // Plain text version for better deliverability
  const textTemplate = `Hello,

Your One-Time Password (OTP) for verification is: ${options.otp}

Please enter this code to complete your verification process.

If you did not request this OTP, please ignore this email.

For any assistance, contact us at contact@pryvegroup.com.

Best regards,
The Pryve Team`;

  // HTML Email Verification Template
  const htmlTemplate = `  
 <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background-color: #f4f4f4; padding: 20px; text-align: center;">
    <h2 style="color: #50483f; margin: 0;">Pryve</h2>
  </div>
  <div style="background-color: #ffffff; padding: 20px; text-align: center;">
    <p>Hello,</p>
    <p>Your One-Time Password (OTP) for verification is:</p>
    <p style="font-size: 24px; font-weight: bold; color: #50483f; margin: 10px 0;">${options.otp}</p>
    <p>Please enter this code to complete your verification process.</p>
  </div>
  <div style="background-color: #f4f4f4; padding: 20px; text-align: center;">
    <p>If you did not request this OTP, please ignore this email.</p>
    <p>For any assistance, contact us at <a href="mailto:contact@pryvegroup.com" style="color: #007bff; text-decoration: none;">contact@pryvegroup.com</a>.</p>
    <p>Best regards,<br/>The Pryve Team</p>
  </div>
</div>
`;

  // Email options with improved headers for better deliverability
  const mailOptions = {
    to: options.email,
    from: `"Pryve" <${process.env.FROM_EMAIL || "contact@pryvegroup.com"}>`,
    replyTo: process.env.REPLY_TO_EMAIL || process.env.FROM_EMAIL || "contact@pryvegroup.com",
    subject: options.subject || "Your OTP Code - Pryve",
    text: textTemplate, // Plain text version
    html: htmlTemplate, // HTML version
    // Additional headers for better deliverability
    headers: {
      'X-Mailer': 'Pryve Email Service',
      'X-Priority': '1',
      'Importance': 'high',
      'List-Unsubscribe': `<mailto:${process.env.FROM_EMAIL || "contact@pryvegroup.com"}?subject=unsubscribe>`,
    },
  };

  console.log(`📧 [SEND EMAIL] Mail options prepared:`, {
    to: mailOptions.to,
    from: mailOptions.from,
    replyTo: mailOptions.replyTo,
    subject: mailOptions.subject,
    htmlLength: mailOptions.html.length
  });

  try {
    await sendEmailWithOffice365(mailOptions);
    console.log(`✅ [SEND EMAIL] Email sent successfully to: ${options.email}`);
    return true;
  } catch (error) {
    console.error(`❌ [SEND EMAIL] Error sending email:`);
    console.error(`❌ [SEND EMAIL] Error message:`, error.message);
    console.error(`❌ [SEND EMAIL] Full error:`, error);
    throw error; // Re-throw so caller knows it failed
  }
};

const sendForgotPasswordEmail = async (options) => {
  console.log(`🔐 [FORGOT PASSWORD] Starting forgot password email process...`);
  console.log(`🔐 [FORGOT PASSWORD] Options received:`, {
    email: options.email,
    subject: options.subject,
    hasOTP: !!options.otp
  });

  // Validate recipient email
  if (!options.email) {
    console.error("❌ [FORGOT PASSWORD] Error: Recipient email is missing.");
    return;
  }

  // Validate OTP or Reset Token
  if (!options.otp) {
    console.error("❌ [FORGOT PASSWORD] Error: No OTP provided.");
    return;
  }

  // Plain text version for better deliverability
  const textTemplate = `Hello,

We received a request to reset your password. Use the OTP below to reset your password:

${options.otp}

If you did not request a password reset, you can ignore this email. Your password will remain unchanged.

For any assistance, contact us at contact@pryvegroup.com.

Best regards,
The Pryve Team`;

  // Forgot Password Email Template
  const htmlTemplate = `  
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background-color: #f4f4f4; padding: 20px; text-align: center;">
    <h2 style="color: #50483f; margin: 0;">Pryve</h2>
  </div>
  <div style="background-color: #ffffff; padding: 20px; text-align: center;">
    <p>Hello,</p>
    <p>We received a request to reset your password. Use the OTP below to reset your password:</p>
    <p style="font-size: 24px; font-weight: bold; color: #50483f; margin: 10px 0;">${options.otp}</p>
    <p>If you did not request a password reset, you can ignore this email. Your password will remain unchanged.</p>
  </div>
  <div style="background-color: #f4f4f4; padding: 20px; text-align: center;">
    <p>For any assistance, contact us at <a href="mailto:contact@pryvegroup.com" style="color: #007bff; text-decoration: none;">contact@pryvegroup.com</a>.</p>
    <p>Best regards,<br/>The Pryve Team</p>
  </div>
</div>
`;

  // Email options with improved headers for better deliverability
  const mailOptions = {
    to: options.email,
    from: `"Pryve" <${process.env.FROM_EMAIL || "contact@pryvegroup.com"}>`,
    replyTo: process.env.REPLY_TO_EMAIL || process.env.FROM_EMAIL || "contact@pryvegroup.com",
    subject: options.subject || "Reset Your Password - Pryve",
    text: textTemplate, // Plain text version
    html: htmlTemplate, // HTML version
    // Additional headers for better deliverability
    headers: {
      'X-Mailer': 'Pryve Email Service',
      'X-Priority': '1',
      'Importance': 'high',
      'List-Unsubscribe': `<mailto:${process.env.FROM_EMAIL || "contact@pryvegroup.com"}?subject=unsubscribe>`,
    },
  };

  console.log(`🔐 [FORGOT PASSWORD] Mail options prepared:`, {
    to: mailOptions.to,
    from: mailOptions.from,
    replyTo: mailOptions.replyTo,
    subject: mailOptions.subject,
    htmlLength: mailOptions.html.length
  });

  try {
    await sendEmailWithOffice365(mailOptions);
    console.log(`✅ [FORGOT PASSWORD] Forgot password email sent successfully to: ${options.email}`);
    return true;
  } catch (error) {
    console.error(`❌ [FORGOT PASSWORD] Error sending forgot password email:`);
    console.error(`❌ [FORGOT PASSWORD] Error message:`, error.message);
    console.error(`❌ [FORGOT PASSWORD] Full error:`, error);
    throw error; // Re-throw so caller knows it failed
  }
};

module.exports = { sendEmail, sendForgotPasswordEmail };
