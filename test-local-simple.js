/**
 * Simple test with new user for text cleanup feature
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3400/api/v1';
const TEST_EMAIL = `test-${Date.now()}@example.com`;
const TEST_PASSWORD = 'testpass123';

async function testWithNewUser() {
  console.log('🧪 Testing Text Cleanup with New User');
  console.log('=' .repeat(50));
  console.log(`📧 Creating user: ${TEST_EMAIL}\n`);

  try {
    // Step 1: Create new user
    console.log('1️⃣ Creating new user...');
    const createResponse = await axios.post(`${BASE_URL}/users/create`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      name: 'Test User'
    });
    
    if (createResponse.data.success) {
      console.log('✅ User created successfully');
    } else {
      console.log('❌ User creation failed:', createResponse.data.message);
      return;
    }

    // Step 2: Login
    console.log('\n2️⃣ Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/users/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    if (!loginResponse.data.success) {
      console.log('❌ Login failed:', loginResponse.data.message);
      return;
    }

    console.log('✅ Login successful');
    const token = loginResponse.data.data.token;
    const headers = { 'Authorization': `Bearer ${token}` };

    // Step 3: Test text cleanup directly
    console.log('\n3️⃣ Testing text cleanup function...');
    
    // Import and test the text processor directly
    const { createCleanTitle } = require('./src/api/v1/utils/textProcessor');
    
    const testMessages = [
      "Hi, I am feeling really good today and I think I made a breakthrough!",
      "Oh well, I just got a promotion at work and I'm so excited!",
      "Yeah, I think I finally understand what I want to do with my life"
    ];
    
    console.log('📝 Text cleanup results:');
    testMessages.forEach((msg, i) => {
      const cleaned = createCleanTitle(msg);
      console.log(`${i+1}. Original: "${msg}"`);
      console.log(`   Cleaned:  "${cleaned}"`);
      console.log('');
    });

    // Step 4: Test endpoint (even if no data)
    console.log('4️⃣ Testing journey endpoint...');
    try {
      const response = await axios.get(
        `${BASE_URL}/chats/journey/messages?category=growth-moments&limit=5`,
        { headers }
      );
      
      console.log('✅ Endpoint accessible');
      console.log(`📊 Items found: ${response.data.data?.items?.length || 0}`);
      
      if (response.data.data?.items?.length > 0) {
        console.log('📝 Sample titles:');
        response.data.data.items.forEach((item, i) => {
          console.log(`   ${i+1}. "${item.title}"`);
        });
      } else {
        console.log('ℹ️  No items found (user has no journey data yet)');
      }
      
    } catch (endpointError) {
      console.log('❌ Endpoint error:', endpointError.response?.data?.message || endpointError.message);
      
      if (endpointError.message.includes('createCleanTitle')) {
        console.log('🔍 Import error detected - text processor not found');
      }
    }

  } catch (error) {
    console.log('❌ Test failed:', error.response?.data?.message || error.message);
  }

  console.log('\n' + '='.repeat(50));
  console.log('🏁 Test completed');
}

testWithNewUser();