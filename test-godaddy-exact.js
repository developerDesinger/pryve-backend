const nodemailer = require("nodemailer");
require('dotenv').config();

// Test exact GoDaddy configuration as provided
const testGoDaddyExact = async () => {
  console.log('🧪 Testing Exact GoDaddy SMTP Configuration...');
  
  const transporter = nodemailer.createTransport({
    host: 'smtpout.secureserver.net',
    port: 587,
    secure: false, // true for port 465
    auth: {
      user: 'contact@pryvegroup.com',
      pass: 'Pryvemvp1!' // Replace with actual password
    },
    name: 'mail.pryvegroup.com' // Important: use your actual domain
  });

  console.log('📧 GoDaddy SMTP Config:', {
    host: 'smtpout.secureserver.net',
    port: 587,
    secure: false,
    username: 'contact@pryvegroup.com',
    domain: 'mail.pryvegroup.com'
  });

  try {
    console.log('🔍 Verifying GoDaddy connection...');
    await transporter.verify();
    console.log('✅ GoDaddy connection verified successfully');
    
    console.log('📤 Sending test email...');
    const info = await transporter.sendMail({
      to: 'shami.pydevs@gmail.com',
      from: 'contact@pryvegroup.com',
      subject: 'Test Email from Pryve - GoDaddy SMTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center;">
            <h2 style="color: #50483f; margin: 0;">Pryve</h2>
          </div>
          <div style="background-color: #ffffff; padding: 20px; text-align: center;">
            <p>Hello,</p>
            <p>This is a test email sent via GoDaddy SMTP.</p>
            <p>Your OTP code is: <strong>123456</strong></p>
            <p>This confirms that GoDaddy SMTP is working correctly.</p>
          </div>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center;">
            <p>Best regards,<br/>The Pryve Team</p>
          </div>
        </div>
      `
    });
    
    console.log('✅ Email sent successfully via GoDaddy SMTP!');
    console.log('📧 Message ID:', info.messageId);
    console.log('📧 Response:', info.response);
    
  } catch (error) {
    console.error('❌ GoDaddy SMTP failed:', error.message);
    console.log('\n💡 Possible solutions:');
    console.log('1. Verify the password is correct');
    console.log('2. Check if SMTP is enabled in your GoDaddy account');
    console.log('3. Try using an App Password instead of regular password');
    console.log('4. Contact GoDaddy support if authentication continues to fail');
  }
};

testGoDaddyExact();
