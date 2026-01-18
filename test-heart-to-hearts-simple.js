const https = require('https');

// Using the token from the existing test file
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtamsxcWUxZzAwMDBwZWN1aTR2c2U3dGQiLCJyb2xlIjoiQ0xJRU5UIiwiaWF0IjoxNzY3MDEyNTAzLCJleHAiOjE3Njc2MTczMDN9.MteQhI3sDymZLZ09TZE3a7U7Wif72B9Gbz5FymtLll0';

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
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

async function testHeartToHeartsEndpoint() {
  console.log('🚀 Testing Heart-to-Hearts Endpoint');
  console.log('=' .repeat(60));
  
  const url = 'https://pryve-backend.projectco.space/api/v1/chats/journey/messages?category=heart-to-hearts&limit=10';
  console.log(`🔗 URL: ${url}`);
  console.log(`🔑 Token: ${TOKEN.substring(0, 20)}...${TOKEN.substring(TOKEN.length - 10)}`);
  console.log('=' .repeat(60));
  
  try {
    const result = await makeRequest(url, TOKEN);
    
    console.log('\n📊 RESPONSE STATUS');
    console.log(`Status Code: ${result.status}`);
    
    console.log('\n📋 RESPONSE HEADERS');
    console.log(JSON.stringify(result.headers, null, 2));
    
    console.log('\n📄 RESPONSE DATA');
    console.log(JSON.stringify(result.data, null, 2));
    
    if (result.status === 200 && result.data) {
      console.log('\n📈 SUMMARY');
      if (result.data.success) {
        const items = result.data.data?.items || [];
        console.log(`✅ Success: ${result.data.success}`);
        console.log(`📊 Items returned: ${items.length}`);
        console.log(`💬 Message: ${result.data.message || 'No message'}`);
        
        if (items.length > 0) {
          console.log('\n📋 SAMPLE ITEMS:');
          items.slice(0, 3).forEach((item, index) => {
            console.log(`${index + 1}. ID: ${item.id}`);
            console.log(`   Title: ${item.title || 'No title'}`);
            console.log(`   Content: ${item.content?.substring(0, 100) || 'No content'}...`);
            console.log(`   Created: ${item.createdAt}`);
            if (item.emotion) {
              console.log(`   Emotion: ${item.emotion.label} (${item.emotion.confidence})`);
            }
            console.log('');
          });
        } else {
          console.log('⚠️  No items returned - empty array');
        }
      } else {
        console.log(`❌ Success: ${result.data.success}`);
        console.log(`💬 Message: ${result.data.message}`);
      }
    } else {
      console.log(`\n❌ Request failed with status ${result.status}`);
      if (result.status === 401) {
        console.log('🔑 Authentication failed - token may be expired');
      }
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  }
}

testHeartToHeartsEndpoint();