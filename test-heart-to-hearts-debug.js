const axios = require('axios');

const BASE_URL = 'https://pryve-backend.projectco.space/api/v1';

async function debugHeartToHeartsAPI() {
  console.log('🔍 Heart-to-Hearts API Debug Tool');
  console.log('=' .repeat(60));
  
  // Step 1: Get a proper authentication token
  console.log('\n1️⃣ Getting Authentication Token...');
  console.log('-'.repeat(40));
  
  const email = 'test@example.com'; // Replace with your test email
  const password = 'testpassword123'; // Replace with your test password
  
  try {
    // Login to get token
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: email,
      password: password
    });
    
    if (loginResponse.data.success && loginResponse.data.data.token) {
      const token = loginResponse.data.data.token;
      console.log('✅ Login successful!');
      console.log(`🔑 Token: ${token.substring(0, 20)}...`);
      
      // Step 2: Test heart-to-hearts endpoint
      await testHeartToHeartsEndpoint(token);
      
    } else {
      console.log('❌ Login failed. Response:');
      console.log(JSON.stringify(loginResponse.data, null, 2));
      
      // If login fails, try with existing token (if you have one)
      console.log('\n💡 If you have a valid token, you can test manually:');
      console.log('Replace YOUR_TOKEN_HERE with your actual token and run:');
      console.log(`curl -H "Authorization: Bearer YOUR_TOKEN_HERE" "${BASE_URL}/chats/journey/messages?category=heart-to-hearts&limit=10"`);
    }
    
  } catch (error) {
    console.log('❌ Authentication error:', error.message);
    
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    
    console.log('\n💡 Manual testing options:');
    console.log('1. Use Postman with your existing token');
    console.log('2. Check if you have a valid token from previous tests');
    console.log('3. Create a new user account for testing');
  }
}

async function testHeartToHeartsEndpoint(token) {
  console.log('\n2️⃣ Testing Heart-to-Hearts Endpoint...');
  console.log('-'.repeat(40));
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  // Test both possible endpoint paths
  const endpoints = [
    {
      name: 'Chat Route',
      url: `${BASE_URL}/chats/journey/messages?category=heart-to-hearts&limit=10`
    },
    {
      name: 'Direct Route', 
      url: `${BASE_URL}/journey/messages?category=heart-to-hearts&limit=10`
    }
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\n🧪 Testing ${endpoint.name}:`);
    console.log(`🔗 ${endpoint.url}`);
    
    try {
      const response = await axios.get(endpoint.url, { headers });
      
      console.log(`✅ Status: ${response.status}`);
      console.log('📄 Response:');
      console.log(JSON.stringify(response.data, null, 2));
      
      if (response.data.success && response.data.data?.items) {
        const items = response.data.data.items;
        console.log(`\n📊 Found ${items.length} heart-to-hearts messages`);
        
        if (items.length > 0) {
          console.log('\n💝 Heart-to-Hearts Messages:');
          items.forEach((item, index) => {
            console.log(`${index + 1}. ${item.title || item.content?.substring(0, 50) || 'No content'}...`);
            console.log(`   Date: ${item.createdAt || 'No date'}`);
            console.log(`   Chat: ${item.chatName || 'No chat name'}`);
          });
        } else {
          console.log('⚠️ No heart-to-hearts messages found');
        }
      } else {
        console.log('⚠️ Unexpected response format');
      }
      
    } catch (error) {
      console.log(`❌ Error testing ${endpoint.name}:`, error.message);
      
      if (error.response) {
        console.log(`Status: ${error.response.status}`);
        console.log('Response:', JSON.stringify(error.response.data, null, 2));
      }
    }
  }
  
  // Step 3: Check user's journey statistics
  await checkJourneyStatistics(token);
}

async function checkJourneyStatistics(token) {
  console.log('\n3️⃣ Checking Journey Statistics...');
  console.log('-'.repeat(40));
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  try {
    const response = await axios.get(`${BASE_URL}/journey/statistics`, { headers });
    
    console.log(`✅ Status: ${response.status}`);
    console.log('📊 Journey Statistics:');
    
    if (response.data.success && response.data.statistics) {
      const stats = response.data.statistics;
      console.log(`   💝 Heart-to-Hearts: ${stats.heartToHearts || 0}`);
      console.log(`   🌱 Growth Moments: ${stats.growthMoments || 0}`);
      console.log(`   🎯 Goals Achieved: ${stats.goalsAchieved || 0}`);
      console.log(`   💡 Breakthrough Days: ${stats.breakthroughDays || 0}`);
      console.log(`   ⭐ Total Favorites: ${stats.totalFavorites || 0}`);
      console.log(`   💬 Total Messages: ${stats.totalMessages || 0}`);
      
      if (stats.heartToHearts === 0) {
        console.log('\n💡 Troubleshooting: No heart-to-hearts found');
        console.log('   This could mean:');
        console.log('   - No messages have been favorited');
        console.log('   - No user messages (only AI messages) are favorited');
        console.log('   - Emotional analysis hasn\'t processed messages yet');
        console.log('   - User needs to create and favorite some personal messages');
      }
    } else {
      console.log('Response:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.log('❌ Error checking statistics:', error.message);
    
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the debug tool
debugHeartToHeartsAPI().catch(console.error);