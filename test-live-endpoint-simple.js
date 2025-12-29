/**
 * Simple test for live endpoint - you can update the token as needed
 */

const https = require('https');
const http = require('http');

// Update this token with a fresh one
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtamsxcWUxZzAwMDBwZWN1aTR2c2U3dGQiLCJyb2xlIjoiQ0xJRU5UIiwiaWF0IjoxNzY3MDEyNTAzLCJleHAiOjE3Njc2MTQxMjF9.MteQhI3sDymZLZ09TZE3a7U7Wif72B9Gbz5FymtLll0';

function testEndpoint(url, token) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
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

async function testLiveEndpoints() {
  console.log('🧪 Testing Live Endpoints\n');
  
  // Test URLs
  const baseUrl = 'https://pryve-backend.projectco.space/api/v1';
  const endpoints = [
    `${baseUrl}/journey`,
    `${baseUrl}/journey/messages?category=heart-to-hearts&limit=10`,
    `${baseUrl}/chats/journey/messages?category=heart-to-hearts&limit=10`,
    `${baseUrl}/journey/messages?category=growth-moments&limit=10`,
    `${baseUrl}/chats/journey/messages?category=growth-moments&limit=10`
  ];
  
  for (const url of endpoints) {
    console.log(`🔗 Testing: ${url}`);
    
    try {
      const result = await testEndpoint(url, token);
      console.log(`✅ Status: ${result.status}`);
      
      if (result.status === 200) {
        try {
          const jsonData = JSON.parse(result.data);
          console.log('📊 Success Response:');
          
          if (jsonData.data && jsonData.data.items !== undefined) {
            console.log(`   Items: ${jsonData.data.items.length}`);
            console.log(`   Category: ${jsonData.data.category}`);
            
            if (jsonData.data.items.length > 0) {
              console.log('   Sample items:');
              jsonData.data.items.slice(0, 2).forEach((item, index) => {
                console.log(`     ${index + 1}. ${item.title || item.content?.substring(0, 40) || 'No title'}`);
              });
            } else {
              console.log('   ⚠️  Empty items array - this is the issue!');
            }
          } else if (jsonData.data && jsonData.data.statistics) {
            console.log('   Statistics:', JSON.stringify(jsonData.data.statistics, null, 4));
          } else {
            console.log('   Response:', JSON.stringify(jsonData, null, 2));
          }
        } catch (parseError) {
          console.log('📊 Raw Response:', result.data);
        }
      } else {
        console.log('📊 Error Response:', result.data);
      }
      
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
    }
    
    console.log(''); // Empty line for readability
  }
  
  console.log('💡 Instructions:');
  console.log('1. If you get "Invalid or expired token" - update the token in this script');
  console.log('2. If you get empty items arrays - run the fix script on your server');
  console.log('3. If you get connection errors - check the server URL and accessibility');
}

// Run the test
if (require.main === module) {
  testLiveEndpoints().catch(console.error);
}

module.exports = { testLiveEndpoints };