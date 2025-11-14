const nodemailer = require("nodemailer");
require("dotenv").config();

// Test email delivery to multiple providers to isolate the issue
const testEmailDelivery = async () => {
  console.log('🧪 Testing Email Delivery to Multiple Providers...\n');

  const smtpUsername = process.env.SMTP_USERNAME;
  const smtpPassword = process.env.SMTP_PASSWORD;
  const fromEmail = process.env.FROM_EMAIL || "contact@pryvegroup.com";

  if (!smtpUsername || !smtpPassword) {
    console.error('❌ Missing SMTP credentials');
    return;
  }

  // Test email addresses - user can provide their own
  const testEmails = process.argv.slice(2);
  
  if (testEmails.length === 0) {
    console.log('📧 No email addresses provided. Usage:');
    console.log('   node test-email-delivery.js email1@gmail.com email2@outlook.com email3@yahoo.com\n');
    console.log('💡 Suggested test emails:');
    console.log('   - Your Gmail address');
    console.log('   - Your Outlook/Hotmail address');
    console.log('   - Your Yahoo address');
    console.log('   - Your work email\n');
    return;
  }

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

  console.log('📤 Sending test emails...\n');

  for (const testEmail of testEmails) {
    try {
      console.log(`📧 Testing: ${testEmail}`);
      
      const mailOptions = {
        to: testEmail,
        from: `"Pryve" <${fromEmail}>`,
        replyTo: fromEmail,
        subject: `Test Email - ${new Date().toLocaleString()}`,
        text: `This is a test email sent at ${new Date().toISOString()}.

If you received this email, the delivery is working correctly.

Test OTP: 123456

Best regards,
Pryve Team`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f4f4f4; padding: 20px; text-align: center;">
              <h2 style="color: #50483f; margin: 0;">Pryve - Test Email</h2>
            </div>
            <div style="background-color: #ffffff; padding: 20px;">
              <p>This is a test email sent at <strong>${new Date().toLocaleString()}</strong>.</p>
              <p>If you received this email, the delivery is working correctly.</p>
              <p style="font-size: 24px; font-weight: bold; color: #50483f; margin: 20px 0; text-align: center;">
                Test OTP: 123456
              </p>
              <p>Please check:</p>
              <ul>
                <li>Your inbox</li>
                <li>Spam/Junk folder</li>
                <li>Promotions tab (Gmail)</li>
                <li>All Mail folder</li>
              </ul>
            </div>
            <div style="background-color: #f4f4f4; padding: 20px; text-align: center;">
              <p>Best regards,<br/>The Pryve Team</p>
            </div>
          </div>
        `,
        headers: {
          'X-Mailer': 'Pryve Email Service',
          'X-Priority': '1',
          'Importance': 'high',
        },
      };

      const info = await transporter.sendMail(mailOptions);
      
      console.log(`   ✅ Sent successfully!`);
      console.log(`   📧 Message ID: ${info.messageId}`);
      console.log(`   📨 Response: ${info.response}`);
      console.log(`   ⏰ Sent at: ${new Date().toLocaleString()}\n`);

    } catch (error) {
      console.error(`   ❌ Failed to send to ${testEmail}`);
      console.error(`   Error: ${error.message}\n`);
    }
  }

  console.log('📊 Summary:');
  console.log(`   Total emails sent: ${testEmails.length}`);
  console.log(`   Sent at: ${new Date().toLocaleString()}\n`);
  
  console.log('🔍 Next Steps:');
  console.log('   1. Wait 5-15 minutes for emails to arrive');
  console.log('   2. Check ALL folders (Inbox, Spam, Promotions, All Mail)');
  console.log('   3. Check which providers received the email');
  console.log('   4. If Gmail didn\'t receive but others did, it\'s a Gmail-specific issue');
  console.log('   5. Check Office365 message trace for delivery status\n');
  
  console.log('💡 Gmail-Specific Tips:');
  console.log('   - Search Gmail for: from:contact@pryvegroup.com');
  console.log('   - Search Gmail for: "Pryve" or "123456"');
  console.log('   - Check Settings → Filters and Blocked Addresses');
  console.log('   - Check Settings → Spam');
  console.log('   - Try adding contact@pryvegroup.com to contacts\n');
  
  console.log('📋 Office365 Message Trace:');
  console.log('   Go to: https://admin.exchange.microsoft.com/#/messagetrace');
  console.log('   Search for recipient emails to see delivery status\n');
};

testEmailDelivery().catch(console.error);

