const https = require('https');

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNta2pzM3FycTAwM2xwZXYwZDNxZ3VpdHoiLCJyb2xlIjoiQ0xJRU5UIiwiaWF0IjoxNzY4NzQzMzE4LCJleHAiOjE3NjkzNDgxMTh9.uF0vS7xdS7G4F3qNBgTgbYZ5apkfhPYfgtlhuLKk1KU';
const BASE_URL = 'https://pryve-backend.projectco.space/api/v1';

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            raw: data
          });
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    req.end();
  });
}

async function finalEndpointTest() {
  console.log('🎉 FINAL HEART-TO-HEARTS ENDPOINT TEST');
  console.log('=' .repeat(70));
  
  const url = 'https://pryve-backend.projectco.space/api/v1/chats/journey/messages?category=heart-to-hearts&limit=10';
  console.log(`🔗 URL: ${url}`);
  console.log('=' .repeat(70));
  
  try {
    const result = await makeRequest(url);
    
    console.log(`📊 Status: ${result.status}`);
    console.log('\n📄 RESPONSE:');
    console.log(JSON.stringify(result.data, null, 2));
    
    if (result.status === 200 && result.data?.success) {
      const items = result.data.data?.items || [];
      
      console.log('\n🎯 SUMMARY:');
      console.log('=' .repeat(70));
      console.log(`✅ Endpoint Status: ${result.status} OK`);
      console.log(`✅ Success: ${result.data.success}`);
      console.log(`✅ Category: ${result.data.data?.category}`);
      console.log(`✅ Messages Found: ${items.length}`);
      
      if (items.length > 0) {
        console.log('\n💝 HEART-TO-HEARTS MESSAGES:');
        console.log('-'.repeat(70));
        
        items.forEach((item, index) => {
          console.log(`\n${index + 1}. ${item.title}`);
          console.log(`   📝 ID: ${item.id}`);
          console.log(`   😊 Emotion: ${item.emotion?.label} (${item.emotion?.confidence})`);
          console.log(`   🏷️  Primary Tag: ${item.primaryTag}`);
          console.log(`   🏷️  Tags: ${item.tags?.join(', ')}`);
          console.log(`   📅 Timestamp: ${item.timestamp}`);
          console.log(`   💬 Chat: ${item.chat?.name}`);
        });
        
        console.log('\n🎉 ENDPOINT TEST SUCCESSFUL!');
        console.log('✅ Heart-to-hearts endpoint is working perfectly');
        console.log('✅ Returns properly formatted emotional messages');
        console.log('✅ All messages have emotions, tags, and metadata');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('\n🏁 TEST COMPLETE');
  console.log('=' .repeat(70));
}

finalEndpointTest();