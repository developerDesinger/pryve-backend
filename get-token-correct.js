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
        'User-Agent': 'Correct-Token-Generator/1.0'
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

async function getCorrectToken() {
  console.log('🔑 Getting Token with Correct Social Login Format');
  console.log('=' .repeat(60));
  
  try {
    // Correct social login payload based on test file
    console.log('1️⃣ Using Correct Social Login Format');
    console.log('-'.repeat(40));
    
    const timestamp = Date.now();
    const socialLoginData = {
      provider: 'GOOGLE',  // This is the correct field name
      providerId: `google_${timestamp}`,
      email: `test${timestamp}@gmail.com`,
      userName: 'TestUser',
      firstName: 'Test',
      lastName: 'User',
      profilePhoto: 'https://lh3.googleusercontent.com/a/default-user'
    };
    
    console.log(`📧 Email: ${socialLoginData.email}`);
    console.log('📤 Correct Payload:');
    console.log(JSON.stringify(socialLoginData, null, 2));
    
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
        console.log('=' .repeat(60));
        console.log(`🔑 TOKEN: ${token}`);
        console.log(`👤 USER ID: ${userId}`);
        console.log(`📧 EMAIL: ${socialLoginData.email}`);
        console.log('=' .repeat(60));
        
        // Test the heart-to-hearts endpoint immediately
        await testHeartToHeartsWithToken(token);
        return token;
      }
    } else {
      console.log(`❌ Social login failed with status ${socialResult.status}`);
      
      if (socialResult.status === 500) {
        console.log('💡 Server error - might be a database or configuration issue');
      }
    }
    
    // Try minimal payload
    console.log('\n2️⃣ Trying Minimal Payload');
    console.log('-'.repeat(40));
    
    const minimalData = {
      provider: 'GOOGLE',
      providerId: `google_minimal_${Date.now()}`,
      email: `minimal${Date.now()}@gmail.com`
    };
    
    console.log('📤 Minimal Payload:', JSON.stringify(minimalData, null, 2));
    
    const minimalResult = await makeRequest(
      `${BASE_URL}/users/social-login`,
      'POST',
      minimalData
    );
    
    console.log(`📊 Minimal Status: ${minimalResult.status}`);
    console.log(`📄 Minimal Response: ${minimalResult.raw}`);
    
    if (minimalResult.status === 200 && minimalResult.data?.success) {
      const token = minimalResult.data.data?.token || minimalResult.data.token;
      if (token) {
        console.log('\n🎉 SUCCESS with minimal payload!');
        console.log(`🔑 TOKEN: ${token}`);
        await testHeartToHeartsWithToken(token);
        return token;
      }
    }
    
    // Show manual curl command with correct format
    console.log('\n3️⃣ Manual Testing Command');
    console.log('=' .repeat(60));
    console.log('If automatic generation fails, use this curl command:');
    console.log('');
    console.log('curl -X POST https://pryve-backend.projectco.space/api/v1/users/social-login \\');
    console.log('  -H "Content-Type: application/json" \\');
    console.log('  -d \'{');
    console.log('    "provider": "GOOGLE",');
    console.log('    "providerId": "google_manual_123",');
    console.log('    "email": "manual.test@gmail.com",');
    console.log('    "userName": "ManualTest",');
    console.log('    "firstName": "Manual",');
    console.log('    "lastName": "Test"');
    console.log('  }\'');
    console.log('');
    console.log('Then copy the token from the response and test the endpoint manually.');
    
    return null;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

async function testHeartToHeartsWithToken(token) {
  console.log('\n🧪 Testing Heart-to-Hearts Endpoint with Valid Token');
  console.log('=' .repeat(60));
  
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
        'Content-Type': 'application/json',
        'User-Agent': 'Heart-To-Hearts-Test/1.0'
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
              headers: res.headers,
              data: JSON.parse(data),
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
      
      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
      req.end();
    });
    
    console.log('🔗 Endpoint URL:');
    console.log(url);
    console.log(`\n📊 Response Status: ${result.status}`);
    console.log('\n📋 Response Headers:');
    console.log(JSON.stringify(result.headers, null, 2));
    console.log('\n📄 HEART-TO-HEARTS ENDPOINT RESPONSE:');
    console.log('=' .repeat(60));
    console.log(JSON.stringify(result.data, null, 2));
    console.log('=' .repeat(60));
    
    if (result.status === 200) {
      console.log('\n✅ SUCCESS! Endpoint responded successfully');
      
      if (result.data?.success && result.data?.data?.items) {
        const items = result.data.data.items;
        console.log(`\n📊 Found ${items.length} heart-to-hearts messages`);
        
        if (items.length > 0) {
          console.log('\n📋 Heart-to-Hearts Messages:');
          items.forEach((item, index) => {
            console.log(`\n${index + 1}. Message ID: ${item.id}`);
            console.log(`   Title: ${item.title || 'No title'}`);
            console.log(`   Content: ${item.content?.substring(0, 100) || 'No content'}...`);
            console.log(`   Created: ${item.createdAt}`);
            console.log(`   Is Favorite: ${item.isFavorite}`);
            if (item.emotion) {
              console.log(`   Emotion: ${item.emotion.label} (confidence: ${item.emotion.confidence})`);
            }
          });
        } else {
          console.log('\n⚠️  No heart-to-hearts messages found');
          console.log('💡 This could mean:');
          console.log('   - User has no messages with heart-to-hearts emotion');
          console.log('   - Messages exist but are not favorited');
          console.log('   - Messages exist but don\'t have emotion analysis');
        }
        
        if (result.data.data.pagination) {
          const p = result.data.data.pagination;
          console.log(`\n📄 Pagination: Page ${p.page} of ${Math.ceil(p.total / p.limit)} (${p.total} total)`);
        }
      } else {
        console.log('\n⚠️  Unexpected response format');
        console.log('Expected: { success: true, data: { items: [...] } }');
      }
    } else if (result.status === 401) {
      console.log('\n❌ Authentication failed - token invalid or expired');
    } else if (result.status === 404) {
      console.log('\n❌ Endpoint not found - check URL');
    } else {
      console.log(`\n❌ Unexpected status: ${result.status}`);
    }
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
  }
}

if (require.main === module) {
  getCorrectToken().catch(console.error);
}

module.exports = { getCorrectToken, testHeartToHeartsWithToken };