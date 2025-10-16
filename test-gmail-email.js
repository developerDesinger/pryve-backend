const nodemailer = require("nodemailer");
require('dotenv').config();

// Test Gmail SMTP configuration
const testGmailSMTP = async () => {
  console.log('🧪 Testing Gmail SMTP Configuration...');
  
  // Gmail SMTP configuration
  const config = {
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: "your_gmail@gmail.com", // Replace with your Gmail
      pass: "your_app_password" // Replace with your Gmail app password
    }
  };

  console.log('📧 Gmail SMTP Config:', {
    host: config.host,
    port: config.port,
    secure: config.secure,
    username: config.auth.user
  });

  try {
    console.log('🔄 Creating Gmail transporter...');
    const transporter = nodemailer.createTransport(config);
    
    console.log('🔍 Verifying Gmail connection...');
    await transporter.verify();
    console.log('✅ Gmail connection verified successfully');
    
    console.log('📤 Sending test email...');
    const info = await transporter.sendMail({
      to: 'shami.pydevs@gmail.com',
      from: 'your_gmail@gmail.com', // Replace with your Gmail
      subject: 'Test Email from Pryve - Gmail SMTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center;">
            <h2 style="color: #50483f; margin: 0;">Pryve</h2>
          </div>
          <div style="background-color: #ffffff; padding: 20px; text-align: center;">
            <p>Hello,</p>
            <p>This is a test email sent via Gmail SMTP.</p>
            <p>Your OTP code is: <strong>123456</strong></p>
            <p>This confirms that Gmail SMTP is working correctly.</p>
          </div>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center;">
            <p>Best regards,<br/>The Pryve Team</p>
          </div>
        </div>
      `
    });
    
    console.log('✅ Email sent successfully via Gmail SMTP!');
    console.log('📧 Message ID:', info.messageId);
    console.log('📧 Response:', info.response);
    
  } catch (error) {
    console.error('❌ Gmail SMTP failed:', error.message);
    console.log('\n💡 To use Gmail SMTP:');
    console.log('1. Enable 2-factor authentication on your Gmail account');
    console.log('2. Generate an App Password: https://myaccount.google.com/apppasswords');
    console.log('3. Use the App Password instead of your regular password');
    console.log('4. Update the credentials in this test file');
  }
};

testGmailSMTP();
