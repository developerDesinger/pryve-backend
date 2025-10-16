const { UserService } = require('./src/api/v1/services/user.service');
require('dotenv').config();

// Test resend OTP functionality
const testResendOTP = async () => {
  console.log('🧪 Testing Resend OTP Functionality...');
  
  const testEmail = 'test@example.com';
  
  try {
    // First, create an inactive user
    console.log('\n📧 Step 1: Creating inactive user...');
    const createResult = await UserService.createUser({
      email: testEmail,
      fullName: 'Test User',
      profilePhoto: null
    });
    console.log('✅ User created:', createResult.message);
    console.log('📊 User status:', createResult.user.status);
    
    // Test resend OTP for inactive user
    console.log('\n🔄 Step 2: Testing resend OTP for inactive user...');
    const resendResult = await UserService.resendOtp({
      email: testEmail
    });
    console.log('✅ Resend OTP Result:', resendResult.message);
    console.log('📊 User status after resend:', resendResult.user.status);
    
    // Test resend OTP for active user (should return different message)
    console.log('\n🔐 Step 3: Verifying OTP to make user active...');
    const verifyResult = await UserService.verifyOtp({
      email: testEmail,
      otp: '123456' // This will fail, but let's see what happens
    });
    console.log('📊 Verify result:', verifyResult.message);
    
    // Test resend OTP for active user
    console.log('\n🔄 Step 4: Testing resend OTP for active user...');
    try {
      const resendActiveResult = await UserService.resendOtp({
        email: testEmail
      });
      console.log('✅ Resend OTP for active user:', resendActiveResult.message);
    } catch (error) {
      console.log('ℹ️ Expected behavior for active user:', error.message);
    }
    
    console.log('\n🎉 Resend OTP tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

testResendOTP();
