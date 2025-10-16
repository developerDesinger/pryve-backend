const { UserService } = require('./src/api/v1/services/user.service');
require('dotenv').config();

// Test OTP email functionality
const testUserOTP = async () => {
  console.log('🧪 Testing User OTP Email Functionality...');
  
  try {
    // Test createUser with OTP email
    console.log('\n📧 Testing createUser with OTP email...');
    const createResult = await UserService.createUser({
      email: 'test@example.com',
      fullName: 'Test User',
      profilePhoto: null
    });
    console.log('✅ Create User Result:', createResult.message);
    
    // Test resendOtp
    console.log('\n🔄 Testing resendOtp...');
    const resendResult = await UserService.resendOtp({
      email: 'test@example.com'
    });
    console.log('✅ Resend OTP Result:', resendResult.message);
    
    // Test forgotPassword
    console.log('\n🔐 Testing forgotPassword...');
    const forgotResult = await UserService.forgotPassword({
      email: 'test@example.com'
    });
    console.log('✅ Forgot Password Result:', forgotResult.message);
    
    console.log('\n🎉 All OTP email tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

testUserOTP();
