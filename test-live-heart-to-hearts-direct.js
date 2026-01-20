const https = require('https');

// Using the existing token from the live test file
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtamsxcWUxZzAwMDBwZWN1aTR2c2U3dGQiLCJyb2xlIjoiQ0xJRU5UIiwiaWF0IjoxNzY3MDEyNTAzLCJleHAiOjE3Njc2MTczMDN9.MteQhI3sDymZLZ09TZE3a7U7Wif72B9Gbz5FymtLll0';

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
        'User-Agent': 'Live-Endpoint-Test/1.0'
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

async function testLiveEndpoint() {
  console.log('🚀 Testing Live Heart-to-Hearts Endpoint');
  console.log('=' .repeat(60));
  console.log(`🌐 Server: ${BASE_URL}`);
  console.log(`🔑 Token: ${TOKEN.substring(0, 20)}...${TOKEN.substring(TOKEN.length - 10)}`);
  console.log('=' .repeat(60));
  
  try {
    // Test the exact endpoint you provided
    const endpoint = `${BASE_URL}/api/v1/chats/journey/messages?category=heart-to-hearts&limit=10`;
    console.log(`\n🎯 Testing: ${endpoint}`);
    
    const result = await makeRequest(endpoint, TOKEN);
    
    console.log(`\n📊 Status: ${result.status}`);
    
    if (result.status === 200) {
      console.log('✅ SUCCESS!');
      console.log('\n📋 Response Data:');
      console.log(JSON.stringify(result.data, null, 2));
      
      // Check if we have items
      const items = result.data.data?.items || [];
      console.log(`\n📈 Items Count: ${items.length}`);
      
      if (items.length > 0) {
        console.log('\n🎉 Found heart-to-hearts messages!');
        items.forEach((item, index) => {
          console.log(`\n${index + 1}. ${item.title || 'No title'}`);
          console.log(`   Content: ${item.content?.substring(0, 100) || 'No content'}...`);
          if (item.emotion) {
            console.log(`   Emotion: ${item.emotion.label} (${item.emotion.confidence})`);
          }
          console.log(`   Created: ${item.createdAt}`);
        });
      } else {
        console.log('\n⚠️  Empty array returned - no heart-to-hearts messages found');
      }
    } else if (result.status === 401) {
      console.log('❌ UNAUTHORIZED - Token expired or invalid');
      console.log('💡 Need to get a fresh token');
    } else {
      console.log(`❌ FAILED with status ${result.status}`);
      console.log(`📊 Response: ${result.raw}`);
    }
    
    // Also test other categories for comparison
    console.log('\n' + '='.repeat(60));
    console.log('🔍 Testing Other Categories for Comparison');
    console.log('=' .repeat(60));
    
    const categories = ['goals-achieved', 'growth-moments', 'breakthrough-days'];
    
    for (const category of categories) {
      const categoryEndpoint = `${BASE_URL}/api/v1/chats/journey/messages?category=${category}&limit=5`;
      console.log(`\n📂 Testing: ${category}`);
      console.log(`🔗 ${categoryEndpoint}`);
      
      try {
        const categoryResult = await makeRequest(categoryEndpoint, TOKEN);
        const items = categoryResult.data?.data?.items || [];
        console.log(`   Status: ${categoryResult.status} | Items: ${items.length}`);
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  console.log('\n✨ Live endpoint test completed!');
}

// Run the test
testLiveEndpoint().catch(console.error);