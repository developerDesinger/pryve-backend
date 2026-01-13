/**
 * Simple Token Creator - Create a test token quickly
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3400/api/v1';

async function createSimpleToken() {
  console.log('🔑 Creating Simple Test Token');
  console.log('=' .repeat(50));
  
  try {
    // Try different approaches to get a token
    
    // Approach 1: Try social login with a test account
    console.log('1️⃣ Trying social login approach...');
    
    const socialLoginData = {
      email: 'speedtest@test.com',
      fullName: 'Speed Test User',
      loginType: 'GOOGLE',
      providerId: 'google_test_123',
      profilePhoto: 'https://example.com/photo.jpg'
    };
    
    try {
      const socialResponse = await axios.post(`${BASE_URL}/users/social-login`, socialLoginData);
      
      if (socialResponse.data.success && socialResponse.data.data?.token) {
        console.log('✅ Social login successful!');
        const token = socialResponse.data.data.token;
        const userId = socialResponse.data.data.user?.id;
        
        console.log('\n🎉 TOKEN CREATED SUCCESSFULLY!');
        console.log('=' .repeat(50));
        console.log(`🔑 Token: ${token}`);
        console.log(`👤 User ID: ${userId}`);
        console.log(`📧 Email: ${socialLoginData.email}`);
        console.log('=' .repeat(50));
        
        return { token, userId, email: socialLoginData.email };
      }
    } catch (socialError) {
      console.log('❌ Social login failed:', socialError.response?.data?.message || socialError.message);
    }
    
    // Approach 2: Try to create a user without OTP (if there's a direct endpoint)
    console.log('\n2️⃣ Trying direct user creation...');
    
    const directUserData = {
      email: `speedtest${Date.now()}@test.com`,
      password: 'TestPassword123!',
      fullName: 'Speed Test User',
      firstName: 'Speed',
      lastName: 'Test',
      userName: `speedtest${Date.now()}`,
      loginType: 'EMAIL'
    };
    
    try {
      // Try to create user and immediately login
      const createResponse = await axios.post(`${BASE_URL}/users/create`, directUserData);
      console.log('User creation response:', createResponse.data);
      
      // If user was created, try to login (might need OTP verification)
      if (createResponse.data.success) {
        console.log('✅ User created, attempting login...');
        
        const loginResponse = await axios.post(`${BASE_URL}/users/login`, {
          email: directUserData.email,
          password: directUserData.password
        });
        
        if (loginResponse.data.success && loginResponse.data.data?.token) {
          const token = loginResponse.data.data.token;
          const userId = loginResponse.data.data.user?.id;
          
          console.log('\n🎉 TOKEN CREATED SUCCESSFULLY!');
          console.log('=' .repeat(50));
          console.log(`🔑 Token: ${token}`);
          console.log(`👤 User ID: ${userId}`);
          console.log(`📧 Email: ${directUserData.email}`);
          console.log('=' .repeat(50));
          
          return { token, userId, email: directUserData.email };
        }
      }
    } catch (directError) {
      console.log('❌ Direct creation failed:', directError.response?.data?.message || directError.message);
    }
    
    // Approach 3: Manual token creation (if we can access the database directly)
    console.log('\n3️⃣ Manual token approach...');
    console.log('💡 You can manually create a token by:');
    console.log('   1. Using your frontend app to login');
    console.log('   2. Copying the JWT token from browser dev tools');
    console.log('   3. Or using Postman to login and get a token');
    
    return null;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

if (require.main === module) {
  createSimpleToken().then(result => {
    if (result) {
      console.log('\n🚀 Ready to test! Use this token in your speed test.');
    } else {
      console.log('\n❌ Could not create token automatically.');
      console.log('💡 Please get a token manually and update the test file.');
    }
  }).catch(console.error);
}

module.exports = { createSimpleToken };