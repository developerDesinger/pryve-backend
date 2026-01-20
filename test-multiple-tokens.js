const https = require('https');

// Multiple tokens from the codebase - trying to find a working one
const TOKENS = [
  // Most recent token from test-simplified-journey.js
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNta2pzM3FycTAwM2xwZXYwZDNxZ3VpdHoiLCJyb2xlIjoiQ0xJRU5UIiwiaWF0IjoxNzY4NzQzMzE4LCJleHAiOjE3NjkzNDgxMTh9.uF0vS7xdS7G4F3qNBgTgbYZ5apkfhPYfgtlhuLKk1KU',
  
  // Token from test-live-journey-complete.js
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtamsxcWUxZzAwMDBwZWN1aTR2c2U3dGQiLCJyb2xlIjoiQ0xJRU5UIiwiaWF0IjoxNzY3MDEyNTAzLCJleHAiOjE3Njc2MTczMDN9.MteQhI3sDymZLZ09TZE3a7U7Wif72B9Gbz5FymtLll0',
  
  // Token from test-with-existing-token.js
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtZ2dxbmx2ajAwMDB1amRnZWJxdGR6dnYiLCJyb2xlIjoiQ0xJRU5UIiwiaWF0IjoxNzY2NjUwOTIwLCJleHAiOjE3NjcyNTU3MjB9.qK_sk_MDN6WbX7klt-cNv2tAD32TdMu2W9ILIVrIknM',
  
  // Another token from test-with-existing-token.js
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtamsxcWUxZzAwMDBwZWN1aTR2c2U3dGQiLCJyb2xlIjoiQ0xJRU5UIiwiaWF0IjoxNzY3ODUwMzQ3LCJleHAiOjE3Njg0NTUxNDd9.7BF8I4WOpn7BzWlAjTIMmlBP-JiMfMuHjp6Ki_YmPuE'
];

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
        'User-Agent': 'Token-Test/1.0'
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
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

function decodeJWT(token) {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
    return decoded;
  } catch (error) {
    return null;
  }
}

async function testToken(token, index) {
  console.log(`\n🧪 Testing Token ${index + 1}:`);
  console.log(`🔑 ${token.substring(0, 20)}...${token.substring(token.length - 10)}`);
  
  // Decode token to check expiration
  const decoded = decodeJWT(token);
  if (decoded) {
    const now = Math.floor(Date.now() / 1000);
    const isExpired = decoded.exp < now;
    const expirationDate = new Date(decoded.exp * 1000);
    
    console.log(`👤 User ID: ${decoded.id}`);
    console.log(`⏰ Expires: ${expirationDate.toISOString()}`);
    console.log(`📊 Status: ${isExpired ? '❌ EXPIRED' : '✅ VALID'}`);
    
    if (isExpired) {
      console.log('⏭️  Skipping expired token');
      return null;
    }
  }
  
  try {
    // Test the heart-to-hearts endpoint
    const endpoint = `${BASE_URL}/api/v1/chats/journey/messages?category=heart-to-hearts&limit=10`;
    const result = await makeRequest(endpoint, token);
    
    console.log(`📊 Response Status: ${result.status}`);
    
    if (result.status === 200) {
      console.log('✅ TOKEN WORKS!');
      console.log('\n📋 Heart-to-Hearts Response:');
      console.log(JSON.stringify(result.data, null, 2));
      
      const items = result.data.data?.items || [];
      console.log(`\n📈 Items Found: ${items.length}`);
      
      if (items.length > 0) {
        console.log('\n🎉 Sample Messages:');
        items.slice(0, 2).forEach((item, idx) => {
          console.log(`\n${idx + 1}. ${item.title || 'No title'}`);
          console.log(`   Content: ${item.content?.substring(0, 80) || 'No content'}...`);
          if (item.emotion) {
            console.log(`   Emotion: ${item.emotion.label} (${item.emotion.confidence})`);
          }
        });
      } else {
        console.log('\n⚠️  Empty array - endpoint works but no data');
      }
      
      return { token, result: result.data };
    } else if (result.status === 401) {
      console.log('❌ Token expired or invalid');
      return null;
    } else {
      console.log(`❌ Failed with status ${result.status}`);
      console.log(`📊 Response: ${result.raw}`);
      return null;
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('🚀 Testing Multiple Tokens for Heart-to-Hearts Endpoint');
  console.log('=' .repeat(60));
  console.log(`🌐 Server: ${BASE_URL}`);
  console.log(`🔗 Endpoint: /api/v1/chats/journey/messages?category=heart-to-hearts&limit=10`);
  console.log(`🧪 Testing ${TOKENS.length} tokens...`);
  console.log('=' .repeat(60));
  
  let workingToken = null;
  
  for (let i = 0; i < TOKENS.length; i++) {
    const result = await testToken(TOKENS[i], i);
    
    if (result) {
      workingToken = result.token;
      console.log('\n🎉 FOUND WORKING TOKEN!');
      break;
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  if (workingToken) {
    console.log('\n' + '='.repeat(60));
    console.log('🎫 WORKING TOKEN FOR designercoo+1@gmail.com:');
    console.log('=' .repeat(60));
    console.log(workingToken);
    console.log('=' .repeat(60));
    
    console.log('\n📋 Test manually with curl:');
    console.log(`curl -H "Authorization: Bearer ${workingToken}" "${BASE_URL}/api/v1/chats/journey/messages?category=heart-to-hearts&limit=10"`);
    
    console.log('\n🔧 Or use in your scripts:');
    console.log(`const TOKEN = '${workingToken}';`);
  } else {
    console.log('\n❌ No working tokens found');
    console.log('💡 All tokens are expired or invalid');
    console.log('🔄 You may need to generate a fresh token manually');
  }
  
  console.log('\n✨ Token testing completed!');
}

// Run the test
main().catch(console.error);