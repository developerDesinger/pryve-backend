const nodemailer = require("nodemailer");
require("dotenv").config();

// Diagnostic script to troubleshoot email delivery issues
const diagnoseEmailDelivery = async () => {
  console.log('🔍 Diagnosing Email Delivery Issues...\n');

  // Check environment variables
  console.log('📋 Test 1: Checking Environment Variables...');
  const smtpUsername = process.env.SMTP_USERNAME;
  const smtpPassword = process.env.SMTP_PASSWORD;
  const fromEmail = process.env.FROM_EMAIL || "contact@pryvegroup.com";

  if (!smtpUsername || !smtpPassword) {
    console.error('❌ Missing SMTP credentials in environment variables');
    console.error('   Please check your .env file for SMTP_USERNAME and SMTP_PASSWORD');
    return;
  }
  console.log('✅ Environment variables found');
  console.log(`   SMTP Username: ${smtpUsername}`);
  console.log(`   From Email: ${fromEmail}`);
  console.log(`   Password: ${smtpPassword ? '***' + smtpPassword.slice(-3) : 'NOT SET'}\n`);

  // Test connection
  console.log('📡 Test 2: Testing SMTP Connection...');
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.office365.com",
      port: 587,
      secure: false,
      auth: {
        user: smtpUsername,
        pass: smtpPassword
      },
      requireTLS: true,
      name: "mail.pryvegroup.com"
    });

    await transporter.verify();
    console.log('✅ SMTP connection verified successfully\n');
  } catch (error) {
    console.error('❌ SMTP connection failed:', error.message);
    console.error('   This could indicate:');
    console.error('   - Incorrect credentials');
    console.error('   - Account requires app password (if 2FA enabled)');
    console.error('   - SMTP not enabled for this account');
    console.error('   - Account is locked or suspended\n');
    return;
  }

  // Test sending email
  console.log('📤 Test 3: Testing Email Send...');
  const testEmail = process.argv[2] || 'shami.pydevs@gmail.com';
  console.log(`   Sending test email to: ${testEmail}\n`);

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.office365.com",
      port: 587,
      secure: false,
      auth: {
        user: smtpUsername,
        pass: smtpPassword
      },
      requireTLS: true,
      name: "mail.pryvegroup.com"
    });

    const mailOptions = {
      to: testEmail,
      from: fromEmail,
      replyTo: fromEmail,
      subject: 'Test Email - Pryve Email Delivery Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center;">
            <h2 style="color: #50483f; margin: 0;">Pryve</h2>
          </div>
          <div style="background-color: #ffffff; padding: 20px; text-align: center;">
            <p>Hello,</p>
            <p>This is a test email to verify email delivery.</p>
            <p>If you received this email, your email configuration is working correctly.</p>
            <p><strong>Test OTP: 123456</strong></p>
            <p>Sent at: ${new Date().toISOString()}</p>
          </div>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center;">
            <p>Best regards,<br/>The Pryve Team</p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Server Response: ${info.response}\n`);

    // Check response code
    if (info.response && info.response.includes('250')) {
      console.log('✅ Email accepted by Office365 server');
      console.log('   The email was successfully sent from your server.\n');
    } else {
      console.warn('⚠️  Unexpected server response');
      console.warn(`   Response: ${info.response}\n`);
    }

  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    console.error('   Error code:', error.code);
    if (error.response) {
      console.error('   Server response:', error.response);
    }
    console.error('');
    return;
  }

  // Troubleshooting tips
  console.log('💡 Troubleshooting Tips:\n');
  console.log('If the email was sent but not received, check:\n');
  console.log('1. 📧 Check Spam/Junk Folder');
  console.log('   - Gmail, Outlook, and other providers often filter emails');
  console.log('   - Look in your spam/junk folder\n');
  
  console.log('2. ✉️  Verify Email Address');
  console.log('   - Make sure the email address is correct (no typos)');
  console.log('   - In your logs, I noticed: deisgnercoo@gmail.com');
  console.log('   - Did you mean: designercoo@gmail.com?\n');
  
  console.log('3. 🚫 Check Email Provider Blocking');
  console.log('   - Gmail might be blocking emails from new senders');
  console.log('   - Check Gmail\'s "Blocked senders" list');
  console.log('   - Check if emails are being filtered\n');
  
  console.log('4. ⏱️  Delivery Delays');
  console.log('   - Some emails can take 5-15 minutes to arrive');
  console.log('   - Office365 may queue emails during high traffic\n');
  
  console.log('5. 🔒 Office365 Account Settings');
  console.log('   - Verify SMTP is enabled in Office365 admin center');
  console.log('   - Check if account has sending limits');
  console.log('   - Verify the account is not restricted\n');
  
  console.log('6. 📊 Check Office365 Message Trace');
  console.log('   - Log into Office365 admin center');
  console.log('   - Go to Exchange admin center > Mail flow > Message trace');
  console.log('   - Search for the message ID to see delivery status\n');
  
  console.log('7. 🧪 Test with Different Email Provider');
  console.log('   - Try sending to a different email address');
  console.log('   - Test with Outlook, Yahoo, or another provider\n');

  console.log('📝 Next Steps:');
  console.log('   1. Check your spam folder');
  console.log('   2. Verify the email address is correct');
  console.log('   3. Wait 5-10 minutes and check again');
  console.log('   4. Check Office365 message trace for delivery status');
  console.log('   5. Try sending to a different email address\n');
};

// Run diagnostics
diagnoseEmailDelivery().catch(console.error);

