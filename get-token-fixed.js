const https = require('https');

const BASE_URL = 'https://pryve-backend.projectco.space/api/v1';

function makeRequest(url, method, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = data ? JSON.stringify(data) : null;
    
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Fixed-Token-Generator/1.0'
      }
    };

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
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

async function getTokenFixed() {
  console.log('🔑 Getting Token with Fixed Social Login');
  console.log('=' .repeat(50));
  
  try {
    // Fixed social login payload
    console.log('1️⃣ Trying Fixed Social Login');
    console.log('-'.repeat(40));
    
    const socialLoginData = {
      email: `testuser${Date.now()}@gmail.com`,
      fullName: 'Test User',
      loginType: 'GOOGLE', // This should match the enum in your database
      provider: 'google',
      providerId: `google_${Date.now()}`
    };
    
    console.log(`📧 Email: ${socialLoginData.email}`);
    console.log('📤 Payload:', JSON.stringify(socialLoginData, null, 2));
    
    const socialResult = await makeRequest(
      `${BASE_URL}/users/social-login`,
      'POST',
      socialLoginData
    );
    
    console.log(`📊 Status: ${socialResult.status}`);
    console.log(`📄 Response: ${socialResult.raw}`);
    
    if (socialResult.status === 200 && socialResult.data?.success) {
      const token = socialResult.data.data?.token || socialResult.data.token;
      const userId = socialResult.data.data?.user?.id || socialResult.data.user?.id;
      
      if (token) {
        console.log('\n🎉 SUCCESS! Token Generated');
        console.log('=' .repeat(50));
        console.log(`🔑 TOKEN: ${token}`);
        console.log(`👤 USER ID: ${userId}`);
        console.log('=' .repeat(50));
        
        // Test the endpoint immediately
        await testHeartToHeartsWithToken(token);
        return token;
      }
    }
    
    // Try alternative social login formats
    console.log('\n2️⃣ Trying Alternative Social Login Format');
    console.log('-'.repeat(40));
    
    const altSocialData = {
      email: `alttest${Date.now()}@gmail.com`,
      fullName: 'Alt Test User',
      loginType: 'google', // lowercase
      provider: 'google',
      providerId: `google_${Date.now()}`
    };
    
    console.log('📤 Alt Payload:', JSON.stringify(altSocialData, null, 2));
    
    const altResult = await makeRequest(
      `${BASE_URL}/users/social-login`,
      'POST',
      altSocialData
    );
    
    console.log(`📊 Alt Status: ${altResult.status}`);
    console.log(`📄 Alt Response: ${altResult.raw}`);
    
    if (altResult.status === 200 && altResult.data?.success) {
      const token = altResult.data.data?.token || altResult.data.token;
      if (token) {
        console.log('\n🎉 SUCCESS with alternative format!');
        console.log(`🔑 TOKEN: ${token}`);
        await testHeartToHeartsWithToken(token);
        return token;
      }
    }
    
    // If both fail, show the exact curl command to test manually
    console.log('\n3️⃣ Manual Testing with Curl');
    console.log('=' .repeat(50));
    console.log('Copy and paste this curl command to test manually:');
    console.log('');
    console.log('curl -X POST https://pryve-backend.projectco.space/api/v1/users/social-login \\');
    console.log('  -H "Content-Type: application/json" \\');
    console.log('  -d \'{');
    console.log('    "email": "manual.test@gmail.com",');
    console.log('    "fullName": "Manual Test User",');
    console.log('    "loginType": "GOOGLE",');
    console.log('    "provider": "google",');
    console.log('    "providerId": "google_manual_123"');
    console.log('  }\'');
    console.log('');
    console.log('If that works, copy the token and run:');
    console.log('node test-with-manual-token.js <your-token>');
    
    return null;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

async function testHeartToHeartsWithToken(token) {
  console.log('\n🧪 Testing Heart-to-Hearts Endpoint');
  console.log('=' .repeat(50));
  
  const url = 'https://pryve-backend.projectco.space/api/v1/chats/journey/messages?category=heart-to-hearts&limit=10';
  
  try {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const result = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode,
              data: JSON.parse(data),
              raw: data
            });
          } catch (error) {
            resolve({
              status: res.statusCode,
              data: null,
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
    
    console.log('🔗 URL:', url);
    console.log(`📊 Status: ${result.status}`);
    console.log('📄 RESPONSE:');
    console.log('=' .repeat(50));
    console.log(JSON.stringify(result.data, null, 2));
    console.log('=' .repeat(50));
    
    if (result.status === 200 && result.data?.data?.items) {
      const items = result.data.data.items;
      console.log(`\n✅ SUCCESS: Found ${items.length} heart-to-hearts messages`);
      
      if (items.length > 0) {
        console.log('\n📋 Messages:');
        items.forEach((item, index) => {
          console.log(`${index + 1}. ${item.title || 'No title'}`);
          console.log(`   ${item.content?.substring(0, 80) || 'No content'}...`);
          if (item.emotion) {
            console.log(`   Emotion: ${item.emotion.label} (${item.emotion.confidence})`);
          }
        });
      } else {
        console.log('⚠️  No heart-to-hearts messages found (empty array)');
      }
    } else if (result.status === 401) {
      console.log('❌ Token invalid or expired');
    } else {
      console.log(`❌ Unexpected response: ${result.status}`);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

if (require.main === module) {
  getTokenFixed().catch(console.error);
}

module.exports = { getTokenFixed, testHeartToHeartsWithToken };