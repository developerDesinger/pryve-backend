/**
 * Script to get a JWT token for testing the Media Library API
 * 
 * This script will help you get a valid JWT token to test the media library
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3400/api/v1';

async function getTestToken() {
  console.log('🔑 Getting JWT Token for Testing\n');
  
  try {
    // First, let's try to register a test user
    console.log('📝 Registering test user...');
    
    const registerData = {
      email: 'test@example.com',
      password: 'testpassword123',
      fullName: 'Test User'
    };
    
    try {
      const registerResponse = await axios.post(`${BASE_URL}/users/create`, registerData);
      console.log('✅ User registered successfully');
      console.log('📊 Response:', registerResponse.data);
    } catch (registerError) {
      if (registerError.response?.status === 400 && registerError.response?.data?.message?.includes('already exists')) {
        console.log('ℹ️  User already exists, proceeding to login...');
      } else {
        console.log('❌ Registration error:', registerError.response?.data?.message || registerError.message);
        throw registerError;
      }
    }
    
    // Now try to login
    console.log('\n🔐 Logging in...');
    
    const loginData = {
      email: 'test@example.com',
      password: 'testpassword123'
    };
    
    const loginResponse = await axios.post(`${BASE_URL}/users/login`, loginData);
    
    if (loginResponse.data.success && loginResponse.data.token) {
      console.log('✅ Login successful!');
      console.log('🎫 JWT Token:', loginResponse.data.token);
      console.log('\n📋 Copy this token and update it in test-media-library.js:');
      console.log(`const TEST_USER_TOKEN = '${loginResponse.data.token}';`);
      
      return loginResponse.data.token;
    } else {
      console.log('❌ Login failed - no token received');
      console.log('📊 Response:', loginResponse.data);
    }
    
  } catch (error) {
    console.log('❌ Error:', error.response?.data?.message || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Make sure your server is running: npm start');
    }
  }
}

// Run the script
if (require.main === module) {
  getTestToken().catch(console.error);
}

module.exports = { getTestToken };
