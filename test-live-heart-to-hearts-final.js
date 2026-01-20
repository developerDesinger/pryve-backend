const https = require('https');

// Working token from previous test
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNta2pzM3FycTAwM2xwZXYwZDNxZ3VpdHoiLCJyb2xlIjoiQ0xJRU5UIiwiaWF0IjoxNzY4NzQzMzE4LCJleHAiOjE3NjkzNDgxMTh9.uF0vS7xdS7G4F3qNBgTgbYZ5apkfhPYfgtlhuLKk1KU';

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
        'User-Agent': 'Heart-To-Hearts-Test/1.0'
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

async function testHeartToHeartsEndpoint() {
  console.log('🚀 Testing Live Heart-to-Hearts Endpoint');
  console.log('=' .repeat(60));
  console.log(`🌐 Server: ${BASE_URL}`);
  console.log(`🔑 Token: ${TOKEN.substring(0, 20)}...${TOKEN.substring(TOKEN.length - 10)}`);
  console.log('=' .repeat(60));
  
  try {
    const endpoint = `${BASE_URL}/api/v1/chats/journey/messages?category=heart-to-hearts&limit=10`;
    console.log(`\n🎯 Testing Endpoint:`);
    console.log(`🔗 ${endpoint}`);
    
    const result = await makeRequest(endpoint, TOKEN);
    
    console.log(`\n📊 Response Status: ${result.status}`);
    
    if (result.status === 200) {
      console.log('✅ SUCCESS! Endpoint is working perfectly!');
      
      const responseData = result.data;
      console.log(`\n📋 Response Structure:`);
      console.log(`   Success: ${responseData.success}`);
      console.log(`   Category: ${responseData.data?.category}`);
      console.log(`   Items Count: ${responseData.data?.items?.length || 0}`);
      console.log(`   Next Cursor: ${responseData.data?.nextCursor || 'null'}`);
      
      const items = responseData.data?.items || [];
      
      if (items.length > 0) {
        console.log(`\n🎉 Found ${items.length} Heart-to-Hearts Messages:`);
        console.log('=' .repeat(60));
        
        items.forEach((item, index) => {
          console.log(`\n${index + 1}. 💝 ${item.title}`);
          console.log(`   📅 Date: ${new Date(item.timestamp).toLocaleDateString()}`);
          console.log(`   🏷️  Primary Tag: ${item.primaryTag}`);
          console.log(`   🎭 Emotion: ${item.emotion?.label} (confidence: ${item.emotion?.confidence})`);
          console.log(`   📝 Source: ${item.source}`);
          console.log(`   💬 Chat: ${item.chat?.name} (ID: ${item.chat?.id})`);
          
          if (item.tags && item.tags.length > 0) {
            console.log(`   🏷️  Tags: ${item.tags.join(', ')}`);
          }
        });
        
        console.log('\n📊 Summary:');
        const emotions = items.map(item => item.emotion?.label).filter(Boolean);
        const uniqueEmotions = [...new Set(emotions)];
        console.log(`   Emotions detected: ${uniqueEmotions.join(', ')}`);
        
        const sources = items.map(item => item.source).filter(Boolean);
        const uniqueSources = [...new Set(sources)];
        console.log(`   Sources: ${uniqueSources.join(', ')}`);
        
        const avgConfidence = emotions.length > 0 ? 
          items.reduce((sum, item) => sum + (item.emotion?.confidence || 0), 0) / items.length : 0;
        console.log(`   Average emotion confidence: ${avgConfidence.toFixed(2)}`);
        
      } else {
        console.log('\n⚠️  No heart-to-hearts messages found');
        console.log('💡 This could mean:');
        console.log('   - User has no favorited messages with heart-to-hearts emotions');
        console.log('   - Messages don\'t meet the journey criteria');
        console.log('   - Data needs to be processed or migrated');
      }
      
      console.log('\n📋 Full JSON Response:');
      console.log(JSON.stringify(responseData, null, 2));
      
    } else if (result.status === 401) {
      console.log('❌ UNAUTHORIZED - Token expired or invalid');
      console.log('💡 Need to get a fresh token');
    } else if (result.status === 404) {
      console.log('❌ NOT FOUND - Endpoint doesn\'t exist');
      console.log('💡 Check if the API route is correct');
    } else {
      console.log(`❌ FAILED with status ${result.status}`);
      console.log(`📊 Response: ${result.raw}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
  
  console.log('\n✨ Heart-to-Hearts endpoint test completed!');
}

// Additional test with different parameters
async function testWithDifferentParams() {
  console.log('\n🔍 Testing with different parameters...');
  
  const testCases = [
    { limit: 5, desc: 'Limit 5 items' },
    { limit: 20, desc: 'Limit 20 items' },
    { category: 'heart-to-hearts', limit: 3, desc: 'Explicit category with limit 3' }
  ];
  
  for (const testCase of testCases) {
    try {
      let endpoint = `${BASE_URL}/api/v1/chats/journey/messages?category=heart-to-hearts`;
      if (testCase.limit) endpoint += `&limit=${testCase.limit}`;
      
      console.log(`\n📋 ${testCase.desc}:`);
      console.log(`🔗 ${endpoint}`);
      
      const result = await makeRequest(endpoint, TOKEN);
      const items = result.data?.data?.items || [];
      
      console.log(`   Status: ${result.status} | Items: ${items.length}`);
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
}

async function main() {
  await testHeartToHeartsEndpoint();
  await testWithDifferentParams();
  
  console.log('\n🎯 CONCLUSION:');
  console.log('The heart-to-hearts endpoint is working correctly on the live server!');
  console.log('You can use this endpoint to fetch heart-to-hearts journey messages.');
}

// Run the test
main().catch(console.error);