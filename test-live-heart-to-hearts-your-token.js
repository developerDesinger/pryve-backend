const https = require('https');

// Your JWT token
const YOUR_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtanBqN2IxdzAwMGhwZWp0b2R6cDN2YjUiLCJyb2xlIjoiQ0xJRU5UIiwiaWF0IjoxNzY5NTMwNDA2LCJleHAiOjE3NzAxMzUyMDZ9.YL9ecIiGK6kTLdEJEIcZOef_I8XB02laaKP37tqd7Mk';

// Live server configuration
const BASE_URL = 'https://pryve-backend.projectco.space';

function makeRequest(url, token) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Heart-to-Hearts-Test/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: jsonData,
            raw: data
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: null,
            raw: data,
            parseError: error.message
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Request timeout (15s)'));
    });
    
    req.end();
  });
}

async function testHeartToHeartsWithYourToken() {
  console.log('💝 Testing Heart-to-Hearts API with Your Token');
  console.log('=' .repeat(60));
  console.log(`🌐 Live Server: ${BASE_URL}`);
  console.log(`🔑 Your Token: ${YOUR_TOKEN.substring(0, 20)}...${YOUR_TOKEN.substring(YOUR_TOKEN.length - 10)}`);
  console.log('=' .repeat(60));
  
  try {
    // Test 1: Heart-to-Hearts endpoint
    console.log('\n1️⃣ Testing Heart-to-Hearts Endpoint');
    console.log('-'.repeat(40));
    
    const heartEndpoint = `${BASE_URL}/api/v1/chats/journey/messages?category=heart-to-hearts&limit=10`;
    console.log(`🎯 Endpoint: ${heartEndpoint}`);
    
    const heartResult = await makeRequest(heartEndpoint, YOUR_TOKEN);
    
    console.log(`📊 Status: ${heartResult.status}`);
    
    if (heartResult.status === 200) {
      console.log('✅ SUCCESS!');
      console.log('\n📋 Response:');
      console.log(JSON.stringify(heartResult.data, null, 2));
      
      const items = heartResult.data.data?.items || [];
      console.log(`\n📈 Heart-to-Hearts Count: ${items.length}`);
      
      if (items.length > 0) {
        console.log('\n💝 Heart-to-Hearts Messages:');
        items.forEach((item, index) => {
          console.log(`\n${index + 1}. ${item.title || 'No title'}`);
          console.log(`   Content: ${item.content?.substring(0, 100) || 'No content'}...`);
          console.log(`   From: ${item.sender || 'Unknown'}`);
          console.log(`   Chat: ${item.chatName || 'No chat name'}`);
          if (item.emotion) {
            console.log(`   Emotion: ${item.emotion.label} (confidence: ${item.emotion.confidence})`);
          }
          console.log(`   Created: ${item.createdAt}`);
          console.log(`   Favorited: ${item.isFavorited ? 'Yes' : 'No'}`);
        });
      } else {
        console.log('\n⚠️  No heart-to-hearts messages found');
        console.log('💡 This could mean:');
        console.log('   - No messages have been favorited yet');
        console.log('   - No emotional analysis has been done');
        console.log('   - User needs to create and favorite some personal messages');
      }
    } else if (heartResult.status === 401) {
      console.log('❌ UNAUTHORIZED - Token expired or invalid');
      console.log('💡 Your token might have expired. Check expiration time.');
    } else {
      console.log(`❌ FAILED with status ${heartResult.status}`);
      console.log(`📊 Response: ${heartResult.raw}`);
    }
    
    // Test 2: Journey Statistics
    console.log('\n2️⃣ Testing Journey Statistics');
    console.log('-'.repeat(40));
    
    const statsEndpoint = `${BASE_URL}/api/v1/journey/statistics`;
    console.log(`🎯 Endpoint: ${statsEndpoint}`);
    
    const statsResult = await makeRequest(statsEndpoint, YOUR_TOKEN);
    
    console.log(`📊 Status: ${statsResult.status}`);
    
    if (statsResult.status === 200) {
      console.log('✅ Statistics retrieved!');
      console.log('\n📊 Journey Statistics:');
      
      if (statsResult.data.success && statsResult.data.statistics) {
        const stats = statsResult.data.statistics;
        console.log(`   💝 Heart-to-Hearts: ${stats.heartToHearts || 0}`);
        console.log(`   🌱 Growth Moments: ${stats.growthMoments || 0}`);
        console.log(`   🎯 Goals Achieved: ${stats.goalsAchieved || 0}`);
        console.log(`   💡 Breakthrough Days: ${stats.breakthroughDays || 0}`);
        console.log(`   ⭐ Total Favorites: ${stats.totalFavorites || 0}`);
        console.log(`   💬 Total Messages: ${stats.totalMessages || 0}`);
      } else {
        console.log('📋 Full Response:');
        console.log(JSON.stringify(statsResult.data, null, 2));
      }
    } else {
      console.log(`❌ Statistics failed with status ${statsResult.status}`);
      console.log(`📊 Response: ${statsResult.raw}`);
    }
    
    // Test 3: Check other categories for comparison
    console.log('\n3️⃣ Testing Other Categories (for comparison)');
    console.log('-'.repeat(40));
    
    const categories = [
      'goals-achieved',
      'growth-moments', 
      'breakthrough-days'
    ];
    
    for (const category of categories) {
      const categoryEndpoint = `${BASE_URL}/api/v1/chats/journey/messages?category=${category}&limit=3`;
      console.log(`\n📂 Testing: ${category}`);
      
      try {
        const categoryResult = await makeRequest(categoryEndpoint, YOUR_TOKEN);
        const items = categoryResult.data?.data?.items || [];
        console.log(`   Status: ${categoryResult.status} | Items: ${items.length}`);
        
        if (items.length > 0) {
          console.log(`   ✅ Found ${items.length} ${category} messages`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  console.log('\n✨ Heart-to-Hearts API test completed!');
  console.log('\n💡 Next steps if no heart-to-hearts found:');
  console.log('   1. Create some chat messages');
  console.log('   2. Favorite messages that are meaningful to you');
  console.log('   3. Wait for emotional analysis to process');
  console.log('   4. Check again for heart-to-hearts content');
}

// Run the test
testHeartToHeartsWithYourToken().catch(console.error);