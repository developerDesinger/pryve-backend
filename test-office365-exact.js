const nodemailer = require("nodemailer");
require('dotenv').config();

// Test exact Office365 configuration as provided
const testOffice365Exact = async () => {
  console.log('🧪 Testing Exact Office365 SMTP Configuration...');
  
  const transporter = nodemailer.createTransport({
    host: "smtp.office365.com",
    port: 587,
    secure: false, // STARTTLS
    auth: {
      user: "contact@pryvegroup.com", // full Microsoft 365 email
      pass: "Pryvemvp1!" // your Microsoft 365 password
    },
    requireTLS: true,
    name: "mail.pryvegroup.com" // optional but good to include
  });

  console.log('📧 Office365 SMTP Config:', {
    host: "smtp.office365.com",
    port: 587,
    secure: false,
    username: "contact@pryvegroup.com",
    domain: "mail.pryvegroup.com",
    requireTLS: true
  });

  try {
    console.log('🔍 Verifying Office365 connection...');
    await transporter.verify();
    console.log('✅ Office365 connection verified successfully');
    
    console.log('📤 Sending test email...');
    const info = await transporter.sendMail({
      to: 'shami.pydevs@gmail.com',
      from: 'contact@pryvegroup.com',
      subject: 'Test Email from Pryve - Office365 SMTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center;">
            <h2 style="color: #50483f; margin: 0;">Pryve</h2>
          </div>
          <div style="background-color: #ffffff; padding: 20px; text-align: center;">
            <p>Hello,</p>
            <p>This is a test email sent via Office365 SMTP.</p>
            <p>Your OTP code is: <strong>123456</strong></p>
            <p>This confirms that Office365 SMTP is working correctly.</p>
          </div>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center;">
            <p>Best regards,<br/>The Pryve Team</p>
          </div>
        </div>
      `
    });
    
    console.log('✅ Email sent successfully via Office365 SMTP!');
    console.log('📧 Message ID:', info.messageId);
    console.log('📧 Response:', info.response);
    
  } catch (error) {
    console.error('❌ Office365 SMTP failed:', error.message);
    console.log('\n💡 Possible solutions:');
    console.log('1. Verify the password is correct for contact@pryvegroup.com');
    console.log('2. Check if SMTP AUTH is enabled in Office365 admin center');
    console.log('3. Try using an App Password if 2FA is enabled');
    console.log('4. Verify the email account exists and is active');
    console.log('5. Check if there are any restrictions on the account');
  }
};

testOffice365Exact();
