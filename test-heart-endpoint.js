const https = require('https');

// Using the token we just generated
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNta2pzM3FycTAwM2xwZXYwZDNxZ3VpdHoiLCJyb2xlIjoiQ0xJRU5UIiwiaWF0IjoxNzY4NzQzMzE4LCJleHAiOjE3NjkzNDgxMTh9.uF0vS7xdS7G4F3qNBgTgbYZ5apkfhPYfgtlhuLKk1KU';
const BASE_URL = 'https://pryve-backend.projectco.space/api/v1';

function makeRequest(url, method = 'GET', data = null, token = TOKEN) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = data ? JSON.stringify(data) : null;
    
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Heart-Endpoint-Test/1.0'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
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
    
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

async function testHeartEndpoint() {
  console.log('❤️  Testing Heart Endpoint');
  console.log('=' .repeat(60));
  console.log(`🔑 Token: ${TOKEN.substring(0, 20)}...${TOKEN.substring(TOKEN.length - 10)}`);
  console.log('=' .repeat(60));
  
  // Test different possible heart endpoint URLs
  const heartEndpoints = [
    `${BASE_URL}/heart`,
    `${BASE_URL}/hearts`,
    `${BASE_URL}/chats/heart`,
    `${BASE_URL}/chats/hearts`,
    `${BASE_URL}/journey/heart`,
    `${BASE_URL}/journey/hearts`,
    `${BASE_URL}/favorites/heart`,
    `${BASE_URL}/favorites/hearts`,
    `${BASE_URL}/analytics/heart`,
    `${BASE_URL}/analytics/hearts`
  ];
  
  console.log('\n🔍 Testing Possible Heart Endpoint URLs');
  console.log('-'.repeat(60));
  
  for (let i = 0; i < heartEndpoints.length; i++) {
    const url = heartEndpoints[i];
    console.log(`\n${i + 1}. Testing: ${url}`);
    
    try {
      const result = await makeRequest(url);
      
      console.log(`   📊 Status: ${result.status}`);
      
      if (result.status === 200) {
        console.log('   ✅ SUCCESS!');
        console.log('   📄 Response:');
        console.log(JSON.stringify(result.data, null, 4));
      } else if (result.status === 404) {
        console.log('   ❌ Not Found');
      } else if (result.status === 401) {
        console.log('   🔑 Unauthorized');
      } else if (result.status === 405) {
        console.log('   ⚠️  Method Not Allowed');
      } else {
        console.log(`   ⚠️  Status: ${result.status}`);
        console.log(`   📄 Response: ${result.raw}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  // Test with different HTTP methods
  console.log('\n🔄 Testing Different HTTP Methods on /heart');
  console.log('-'.repeat(60));
  
  const methods = ['GET', 'POST', 'PUT', 'DELETE'];
  const heartUrl = `${BASE_URL}/heart`;
  
  for (const method of methods) {
    console.log(`\n${method} ${heartUrl}`);
    
    try {
      const testData = method === 'POST' || method === 'PUT' ? { test: 'data' } : null;
      const result = await makeRequest(heartUrl, method, testData);
      
      console.log(`   📊 Status: ${result.status}`);
      
      if (result.status === 200 || result.status === 201) {
        console.log('   ✅ SUCCESS!');
        console.log('   📄 Response:');
        console.log(JSON.stringify(result.data, null, 4));
      } else if (result.status === 404) {
        console.log('   ❌ Not Found');
      } else if (result.status === 405) {
        console.log('   ⚠️  Method Not Allowed');
      } else {
        console.log(`   📄 Response: ${result.raw}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  // Check if there are any heart-related routes in the API
  console.log('\n🔍 Searching for Heart-Related Patterns');
  console.log('-'.repeat(60));
  
  // Test some common patterns
  const patterns = [
    `${BASE_URL}/user/heart`,
    `${BASE_URL}/user/hearts`,
    `${BASE_URL}/messages/heart`,
    `${BASE_URL}/messages/hearts`,
    `${BASE_URL}/emotions/heart`,
    `${BASE_URL}/emotions/hearts`,
    `${BASE_URL}/stats/heart`,
    `${BASE_URL}/stats/hearts`,
    `${BASE_URL}/dashboard/heart`,
    `${BASE_URL}/dashboard/hearts`
  ];
  
  for (let i = 0; i < patterns.length; i++) {
    const url = patterns[i];
    console.log(`\n${i + 1}. Testing: ${url}`);
    
    try {
      const result = await makeRequest(url);
      
      if (result.status === 200) {
        console.log('   ✅ FOUND!');
        console.log('   📄 Response:');
        console.log(JSON.stringify(result.data, null, 4));
        break; // Stop if we find a working endpoint
      } else {
        console.log(`   📊 Status: ${result.status}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  // Summary
  console.log('\n📋 SUMMARY');
  console.log('=' .repeat(60));
  console.log('🔍 Searched for heart endpoints with various patterns');
  console.log('💡 If no heart endpoint was found, it might be:');
  console.log('   1. Part of another endpoint (like /analytics or /dashboard)');
  console.log('   2. Named differently (like /favorites or /emotions)');
  console.log('   3. Not yet implemented');
  console.log('   4. Requires specific parameters or different authentication');
  console.log('');
  console.log('🔧 Next steps:');
  console.log('   1. Check API documentation for heart-related endpoints');
  console.log('   2. Look at the source code for heart route definitions');
  console.log('   3. Check if heart functionality is part of other endpoints');
}

if (require.main === module) {
  testHeartEndpoint().catch(console.error);
}

module.exports = { testHeartEndpoint };