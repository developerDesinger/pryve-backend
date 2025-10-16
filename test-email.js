const { sendEmail } = require('./src/api/v1/utils/email');
require('dotenv').config();

// Test email configuration
const testEmail = async () => {
  console.log('🧪 Testing email configuration...');
  console.log('SMTP Host:', process.env.SMTP_HOST || 'smtp.office365.com');
  console.log('SMTP Port:', process.env.SMTP_PORT || '587');
  console.log('SMTP Username:', process.env.SMTP_USERNAME || 'contact@pryvegroup.com');
  console.log('From Email:', process.env.FROM_EMAIL || 'contact@pryvegroup.com');
  
  try {
    await sendEmail({
      email: 'shami.pydevs@gmail.com', // Replace with a real email for testing
      otp: '123456',
      subject: 'Test Email from Pryve'
    });
    console.log('✅ Email test completed successfully!');
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
  }
};

testEmail();
