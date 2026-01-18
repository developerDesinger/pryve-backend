const https = require('https');

// Using the valid token we generated
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNta2pzM3FycTAwM2xwZXYwZDNxZ3VpdHoiLCJyb2xlIjoiQ0xJRU5UIiwiaWF0IjoxNzY4NzQzMzE4LCJleHAiOjE3NjkzNDgxMTh9.uF0vS7xdS7G4F3qNBgTgbYZ5apkfhPYfgtlhuLKk1KU';

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
        'User-Agent': 'Heart-To-Hearts-Final-Test/1.0'
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
            headers: res.headers,
            data: jsonData,
            raw: data
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
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
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

async function testHeartToHeartsEndpoint() {
  console.log('💝 Testing Heart-to-Hearts Endpoint');
  console.log('=' .repeat(70));
  
  const url = 'https://pryve-backend.projectco.space/api/v1/chats/journey/messages?category=heart-to-hearts&limit=10';
  
  console.log('🔗 URL:', url);
  console.log(`🔑 Token: ${TOKEN.substring(0, 20)}...${TOKEN.substring(TOKEN.length - 10)}`);
  console.log('=' .repeat(70));
  
  try {
    const startTime = Date.now();
    const result = await makeRequest(url, TOKEN);
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    console.log('\n📊 RESPONSE DETAILS');
    console.log('-'.repeat(50));
    console.log(`Status Code: ${result.status}`);
    console.log(`Response Time: ${responseTime}ms`);
    console.log(`Content Type: ${result.headers['content-type']}`);
    console.log(`Content Length: ${result.headers['content-length']} bytes`);
    
    console.log('\n📋 RESPONSE HEADERS');
    console.log('-'.repeat(50));
    Object.entries(result.headers).forEach(([key, value]) => {
      console.log(`${key}: ${value}`);
    });
    
    console.log('\n📄 RESPONSE BODY');
    console.log('=' .repeat(70));
    console.log(JSON.stringify(result.data, null, 2));
    console.log('=' .repeat(70));
    
    // Analyze the response
    if (result.status === 200) {
      console.log('\n✅ SUCCESS - Endpoint is working correctly!');
      
      if (result.data?.success) {
        console.log('\n📈 RESPONSE ANALYSIS');
        console.log('-'.repeat(50));
        console.log(`✅ Success: ${result.data.success}`);
        console.log(`📂 Category: ${result.data.data?.category || 'Not specified'}`);
        console.log(`📊 Items Count: ${result.data.data?.items?.length || 0}`);
        console.log(`🔄 Next Cursor: ${result.data.data?.nextCursor || 'null'}`);
        
        const items = result.data.data?.items || [];
        
        if (items.length > 0) {
          console.log('\n💝 HEART-TO-HEARTS MESSAGES FOUND:');
          console.log('-'.repeat(50));
          
          items.forEach((item, index) => {
            console.log(`\n${index + 1}. Message Details:`);
            console.log(`   📝 ID: ${item.id}`);
            console.log(`   📰 Title: ${item.title || 'No title'}`);
            console.log(`   💬 Content: ${item.content?.substring(0, 100) || 'No content'}${item.content?.length > 100 ? '...' : ''}`);
            console.log(`   📅 Created: ${item.createdAt}`);
            console.log(`   ⭐ Is Favorite: ${item.isFavorite}`);
            
            if (item.emotion) {
              console.log(`   😊 Emotion: ${item.emotion.label} (confidence: ${item.emotion.confidence})`);
            } else {
              console.log(`   😊 Emotion: Not analyzed`);
            }
            
            if (item.chat) {
              console.log(`   💬 Chat ID: ${item.chat.id}`);
              console.log(`   📰 Chat Title: ${item.chat.title || 'No title'}`);
            }
          });
          
          console.log(`\n🎯 SUMMARY: Found ${items.length} heart-to-hearts messages`);
          
        } else {
          console.log('\n⚠️  NO HEART-TO-HEARTS MESSAGES FOUND');
          console.log('-'.repeat(50));
          console.log('💡 Possible reasons:');
          console.log('   • User has no messages with heart-to-hearts emotions');
          console.log('   • Messages exist but are not favorited');
          console.log('   • Messages exist but lack emotion analysis');
          console.log('   • User needs to have more conversations');
          console.log('');
          console.log('🔧 To get heart-to-hearts messages:');
          console.log('   1. Have conversations with emotional content');
          console.log('   2. Favorite messages that are meaningful');
          console.log('   3. Ensure emotion analysis is working');
          console.log('   4. Messages should express love, connection, vulnerability, etc.');
        }
        
      } else {
        console.log('\n❌ API returned success: false');
        console.log(`💬 Message: ${result.data.message || 'No message provided'}`);
      }
      
    } else if (result.status === 401) {
      console.log('\n🔑 AUTHENTICATION FAILED');
      console.log('-'.repeat(50));
      console.log('❌ Token is invalid or expired');
      console.log('💡 Need to generate a new token');
      
    } else if (result.status === 404) {
      console.log('\n🔍 ENDPOINT NOT FOUND');
      console.log('-'.repeat(50));
      console.log('❌ The endpoint URL might be incorrect');
      console.log('💡 Check if the route exists in the API');
      
    } else {
      console.log(`\n⚠️  UNEXPECTED STATUS: ${result.status}`);
      console.log('-'.repeat(50));
      console.log('📄 Raw Response:', result.raw);
    }
    
    // Test variations
    console.log('\n🧪 TESTING ENDPOINT VARIATIONS');
    console.log('=' .repeat(70));
    
    const variations = [
      'https://pryve-backend.projectco.space/api/v1/chats/journey/messages?category=heart-to-hearts&limit=5',
      'https://pryve-backend.projectco.space/api/v1/chats/journey/messages?category=heart-to-hearts&limit=20',
      'https://pryve-backend.projectco.space/api/v1/chats/journey/messages?category=heart-to-hearts',
      'https://pryve-backend.projectco.space/api/v1/journey/messages?category=heart-to-hearts&limit=10'
    ];
    
    for (let i = 0; i < variations.length; i++) {
      const varUrl = variations[i];
      console.log(`\n${i + 1}. Testing: ${varUrl}`);
      
      try {
        const varResult = await makeRequest(varUrl, TOKEN);
        console.log(`   📊 Status: ${varResult.status}`);
        
        if (varResult.status === 200 && varResult.data?.data?.items) {
          console.log(`   📊 Items: ${varResult.data.data.items.length}`);
        } else if (varResult.status !== 200) {
          console.log(`   ❌ Failed: ${varResult.data?.message || 'Unknown error'}`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('\n❌ REQUEST FAILED');
    console.error('-'.repeat(50));
    console.error('Error:', error.message);
  }
  
  console.log('\n🏁 TEST COMPLETED');
  console.log('=' .repeat(70));
}

if (require.main === module) {
  testHeartToHeartsEndpoint().catch(console.error);
}

module.exports = { testHeartToHeartsEndpoint };