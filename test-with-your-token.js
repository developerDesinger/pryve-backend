const axios = require('axios');

// REPLACE THIS WITH YOUR ACTUAL TOKEN
const YOUR_TOKEN = 'paste_your_token_here';

const BASE_URL = 'https://pryve-backend.projectco.space/api/v1';

async function testWithYourToken() {
  console.log('🔍 Testing Heart-to-Hearts API with Your Token');
  console.log('=' .repeat(60));
  
  if (YOUR_TOKEN === 'paste_your_token_here') {
    console.log('❌ Please replace YOUR_TOKEN with your actual token in this file');
    console.log('💡 Edit test-with-your-token.js and replace "paste_your_token_here" with your token');
    return;
  }
  
  const headers = {
    'Authorization': `Bearer ${YOUR_TOKEN}`,
    'Content-Type': 'application/json'
  };
  
  console.log(`🔑 Using token: ${YOUR_TOKEN.substring(0, 20)}...`);
  
  // Test 1: Heart-to-Hearts endpoint
  console.log('\n1️⃣ Testing Heart-to-Hearts Endpoint...');
  console.log('-'.repeat(40));
  
  try {
    const heartResponse = await axios.get(
      `${BASE_URL}/chats/journey/messages?category=heart-to-hearts&limit=10`,
      { headers }
    );
    
    console.log(`✅ Status: ${heartResponse.status}`);
    console.log('📄 Heart-to-Hearts Response:');
    console.log(JSON.stringify(heartResponse.data, null, 2));
    
    if (heartResponse.data.success && heartResponse.data.data?.items) {
      const items = heartResponse.data.data.items;
      console.log(`\n📊 Found ${items.length} heart-to-hearts messages`);
      
      if (items.length === 0) {
        console.log('\n⚠️ No heart-to-hearts messages found');
        console.log('💡 This could mean:');
        console.log('   - You haven\'t favorited any personal messages yet');
        console.log('   - Your messages haven\'t been processed for emotions yet');
        console.log('   - You need to create some personal/emotional messages first');
      }
    }
    
  } catch (error) {
    console.log('❌ Heart-to-Hearts endpoint error:', error.message);
    
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 401) {
        console.log('\n💡 Token appears to be invalid or expired');
        console.log('   - Try getting a fresh token by logging in again');
        console.log('   - Check if the token format is correct');
      }
    }
  }
  
  // Test 2: Journey Statistics
  console.log('\n2️⃣ Testing Journey Statistics...');
  console.log('-'.repeat(40));
  
  try {
    const statsResponse = await axios.get(`${BASE_URL}/journey/statistics`, { headers });
    
    console.log(`✅ Status: ${statsResponse.status}`);
    console.log('📊 Journey Statistics:');
    
    if (statsResponse.data.success && statsResponse.data.statistics) {
      const stats = statsResponse.data.statistics;
      console.log(`   💝 Heart-to-Hearts: ${stats.heartToHearts || 0}`);
      console.log(`   🌱 Growth Moments: ${stats.growthMoments || 0}`);
      console.log(`   🎯 Goals Achieved: ${stats.goalsAchieved || 0}`);
      console.log(`   💡 Breakthrough Days: ${stats.breakthroughDays || 0}`);
      console.log(`   ⭐ Total Favorites: ${stats.totalFavorites || 0}`);
      console.log(`   💬 Total Messages: ${stats.totalMessages || 0}`);
    }
    
  } catch (error) {
    console.log('❌ Statistics endpoint error:', error.message);
    
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
  
  // Test 3: User Profile (to verify token works)
  console.log('\n3️⃣ Testing User Profile (Token Verification)...');
  console.log('-'.repeat(40));
  
  try {
    const profileResponse = await axios.get(`${BASE_URL}/user/profile`, { headers });
    
    console.log(`✅ Status: ${profileResponse.status}`);
    console.log('👤 User Profile:');
    
    if (profileResponse.data.success && profileResponse.data.data) {
      const user = profileResponse.data.data;
      console.log(`   Email: ${user.email || 'No email'}`);
      console.log(`   Name: ${user.name || 'No name'}`);
      console.log(`   ID: ${user.id || 'No ID'}`);
      console.log('✅ Token is valid and working!');
    }
    
  } catch (error) {
    console.log('❌ Profile endpoint error:', error.message);
    
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      
      if (error.response.status === 401) {
        console.log('❌ Token is invalid or expired');
        console.log('💡 You need to get a fresh token by logging in again');
      }
    }
  }
  
  console.log('\n🎯 Summary:');
  console.log('If heart-to-hearts is empty but token works:');
  console.log('1. Create some personal/emotional messages in the app');
  console.log('2. Favorite those messages (tap the heart icon)');
  console.log('3. Wait a few seconds for processing');
  console.log('4. Try the API again');
}

// Run the test
testWithYourToken().catch(console.error);