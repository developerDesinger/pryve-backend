const nodemailer = require("nodemailer");
const sgMail = require("@sendgrid/mail");
require("dotenv").config(); // Load environment variables

// Set SendGrid API Key as fallback
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Create SMTP transporter for Office365
const createTransporter = () => {
  const config = {
    host: process.env.SMTP_HOST || "smtp.office365.com",
    port: process.env.SMTP_PORT || 587,
    secure: false, // STARTTLS
    auth: {
      user: process.env.SMTP_USERNAME || "contact@pryvegroup.com",
      pass: process.env.SMTP_PASSWORD || "Pryvemvp1!"
    },
    requireTLS: true,
    name: "mail.pryvegroup.com" // optional but good to include
  };

  console.log(`🔧 [SMTP CONFIG] Creating transporter with config:`, {
    host: config.host,
    port: config.port,
    secure: config.secure,
    username: config.auth.user,
    hasPassword: !!config.auth.pass
  });

  return nodemailer.createTransport(config);
};

// Multiple SMTP configurations to try
const getSMTPConfigs = () => {
  return [
    // Office365 Configuration 1 - Primary
    {
      name: "Office365 SMTP (smtp.office365.com:587)",
      host: process.env.SMTP_HOST || "smtp.office365.com",
      port: 587,
      secure: false, // STARTTLS
      auth: {
        user: process.env.SMTP_USERNAME || "contact@pryvegroup.com",
        pass: process.env.SMTP_PASSWORD || "Pryvemvp1!"
      },
      requireTLS: true,
      name: "mail.pryvegroup.com"
    },
    // Office365 Configuration 2 - Port 465 with SSL
    {
      name: "Office365 SMTP (smtp.office365.com:465)",
      host: "smtp.office365.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USERNAME || "contact@pryvegroup.com",
        pass: process.env.SMTP_PASSWORD || "Pryvemvp1!"
      },
      name: "mail.pryvegroup.com"
    },
    // GoDaddy Configuration - Fallback
    {
      name: "GoDaddy SMTP (smtpout.secureserver.net:587)",
      host: "smtpout.secureserver.net",
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USERNAME || "contact@pryvegroup.com",
        pass: process.env.SMTP_PASSWORD || "Pryvemvp1!"
      },
      name: 'mail.pryvegroup.com'
    },
    // Gmail Configuration (if provided)
    ...(process.env.GMAIL_USERNAME ? [{
      name: "Gmail SMTP",
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.GMAIL_USERNAME,
        pass: process.env.GMAIL_PASSWORD
      }
    }] : [])
  ];
};

// Try multiple SMTP configurations
const sendEmailWithMultipleConfigs = async (mailOptions) => {
  const configs = getSMTPConfigs();
  
  for (let i = 0; i < configs.length; i++) {
    const config = configs[i];
    console.log(`🔄 [EMAIL FALLBACK] Trying configuration ${i + 1}/${configs.length}: ${config.name}`);
    
    try {
      const transporter = nodemailer.createTransport(config);
      
      // Verify connection
      console.log(`🔍 [EMAIL FALLBACK] Verifying connection for ${config.name}...`);
      await transporter.verify();
      console.log(`✅ [EMAIL FALLBACK] Connection verified for ${config.name}`);
      
      // Send email
      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ [EMAIL FALLBACK] Email sent successfully via ${config.name}`);
      console.log(`📧 [EMAIL FALLBACK] Message ID: ${info.messageId}`);
      return true;
      
    } catch (error) {
      console.log(`❌ [EMAIL FALLBACK] ${config.name} failed:`, error.message);
      
      // If this is the last config and we have SendGrid, try SendGrid
      if (i === configs.length - 1) {
        console.log(`🔄 [EMAIL FALLBACK] All SMTP configs failed, trying SendGrid...`);
        
        if (process.env.SENDGRID_API_KEY) {
          try {
            const response = await sgMail.send({
              to: mailOptions.to,
              from: mailOptions.from,
              subject: mailOptions.subject,
              html: mailOptions.html
            });
            console.log(`✅ [EMAIL FALLBACK] Email sent via SendGrid`);
            console.log(`📧 [EMAIL FALLBACK] SendGrid Status: ${response[0].statusCode}`);
            return true;
          } catch (sendgridError) {
            console.error(`❌ [EMAIL FALLBACK] SendGrid also failed:`, sendgridError.message);
            throw new Error(`All email methods failed. Last error: ${error.message}`);
          }
        } else {
          throw new Error(`All SMTP configurations failed. Last error: ${error.message}`);
        }
      }
    }
  }
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
    return;
  }

  // Validate OTP
  if (!options.otp) {
    console.error("❌ [SEND EMAIL] Error: No OTP provided.");
    return;
  }

  // Email Verification Template
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

  // Email options
  const mailOptions = {
    to: options.email,
    from: process.env.FROM_EMAIL || "contact@pryvegroup.com",
    subject: options.subject || "Your OTP Code",
    html: htmlTemplate,
  };

  console.log(`📧 [SEND EMAIL] Mail options prepared:`, {
    to: mailOptions.to,
    from: mailOptions.from,
    subject: mailOptions.subject,
    htmlLength: mailOptions.html.length
  });

  try {
    await sendEmailWithMultipleConfigs(mailOptions);
    console.log(`✅ [SEND EMAIL] Email sent successfully to: ${options.email}`);
  } catch (error) {
    console.error(`❌ [SEND EMAIL] Error sending email:`);
    console.error(`❌ [SEND EMAIL] Error message:`, error.message);
    console.error(`❌ [SEND EMAIL] Full error:`, error);
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

  // Email options
  const mailOptions = {
    to: options.email,
    from: process.env.FROM_EMAIL || "contact@pryvegroup.com",
    subject: options.subject || "Reset Your Password",
    html: htmlTemplate,
  };

  console.log(`🔐 [FORGOT PASSWORD] Mail options prepared:`, {
    to: mailOptions.to,
    from: mailOptions.from,
    subject: mailOptions.subject,
    htmlLength: mailOptions.html.length
  });

  try {
    await sendEmailWithMultipleConfigs(mailOptions);
    console.log(`✅ [FORGOT PASSWORD] Forgot password email sent successfully to: ${options.email}`);
  } catch (error) {
    console.error(`❌ [FORGOT PASSWORD] Error sending forgot password email:`);
    console.error(`❌ [FORGOT PASSWORD] Error message:`, error.message);
    console.error(`❌ [FORGOT PASSWORD] Full error:`, error);
  }
};

module.exports = { sendEmail, sendForgotPasswordEmail };

// module.exports = sendEmail;
