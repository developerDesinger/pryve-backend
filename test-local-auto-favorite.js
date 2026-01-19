const axios = require('axios');

// Simple test for local development
async function testLocalAutoFavorite() {
  try {
    console.log('🧪 Testing Auto-Favorite Fix Locally...\n');

    // Test with localhost
    const BASE_URL = 'http://localhost:3000/api/v1';
    
    // You'll need to update these with actual test credentials
    const TEST_EMAIL = 'test@example.com';
    const TEST_PASSWORD = 'password123';

    console.log('📝 Instructions:');
    console.log('1. Make sure your local server is running (npm start)');
    console.log('2. Update TEST_EMAIL and TEST_PASSWORD in this script');
    console.log('3. Run: node test-local-auto-favorite.js\n');

    // Quick connection test
    try {
      const healthCheck = await axios.get(`${BASE_URL}/health`);
      console.log('✅ Server is running');
    } catch (error) {
      console.log('❌ Server not responding. Make sure it\'s running on port 3000');
      return;
    }

    // Test login
    console.log('\n🔐 Testing login...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    if (loginResponse.data.success) {
      console.log('✅ Login successful');
      
      const token = loginResponse.data.data.token;
      
      // Test message sending
      console.log('\n💬 To test auto-favoriting:');
      console.log('1. Send an emotional message through your app');
      console.log('2. Check the server logs for auto-favoriting messages');
      console.log('3. Check your favorites in the app');
      console.log('4. Check journey states for updates');
      
    } else {
      console.log('❌ Login failed. Check credentials.');
    }

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Cannot connect to server. Make sure it\'s running on localhost:3000');
    } else {
      console.log('❌ Error:', error.message);
    }
  }
}

testLocalAutoFavorite();