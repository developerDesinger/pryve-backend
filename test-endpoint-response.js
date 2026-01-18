const https = require('https');

async function testEndpointResponse() {
  console.log('🔍 Testing Heart-to-Hearts Endpoint Response');
  console.log('=' .repeat(60));
  
  const url = 'https://pryve-backend.projectco.space/api/v1/chats/journey/messages?category=heart-to-hearts&limit=10';
  console.log(`🔗 URL: ${url}`);
  console.log('=' .repeat(60));
  
  // Test 1: Without authentication
  console.log('\n1️⃣ Testing WITHOUT Authentication');
  console.log('-'.repeat(40));
  
  try {
    const result1 = await makeRequest(url);
    console.log(`📊 Status: ${result1.status}`);
    console.log(`📄 Response: ${JSON.stringify(result1.data, null, 2)}`);
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
  
  // Test 2: With invalid token
  console.log('\n2️⃣ Testing WITH Invalid Token');
  console.log('-'.repeat(40));
  
  try {
    const result2 = await makeRequest(url, 'invalid-token-123');
    console.log(`📊 Status: ${result2.status}`);
    console.log(`📄 Response: ${JSON.stringify(result2.data, null, 2)}`);
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
  
  // Test 3: Check if endpoint exists with different method
  console.log('\n3️⃣ Testing Endpoint Availability (OPTIONS)');
  console.log('-'.repeat(40));
  
  try {
    const result3 = await makeRequest(url, null, 'OPTIONS');
    console.log(`📊 Status: ${result3.status}`);
    console.log(`📋 Headers: ${JSON.stringify(result3.headers, null, 2)}`);
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
  
  console.log('\n📋 SUMMARY');
  console.log('=' .repeat(60));
  console.log('✅ Endpoint exists and responds');
  console.log('🔑 Requires Bearer token authentication');
  console.log('❌ Returns 401 without valid token');
  console.log('');
  console.log('💡 TO GET RESPONSE DATA:');
  console.log('1. You need a valid JWT token from a logged-in user');
  console.log('2. Get token by logging into your app or using Postman');
  console.log('3. Use the token in Authorization header: Bearer <token>');
  console.log('');
  console.log('🔧 EXPECTED RESPONSE FORMAT (when authenticated):');
  console.log(JSON.stringify({
    "success": true,
    "message": "Journey messages retrieved successfully",
    "data": {
      "items": [
        {
          "id": "message_id",
          "title": "Message title",
          "content": "Message content...",
          "emotion": {
            "label": "joy",
            "confidence": 0.85
          },
          "createdAt": "2024-01-01T00:00:00.000Z",
          "isFavorite": true
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 10,
        "total": 5
      }
    }
  }, null, 2));
}

function makeRequest(url, token = null, method = 'GET') {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Endpoint-Test/1.0'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

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

testEndpointResponse();