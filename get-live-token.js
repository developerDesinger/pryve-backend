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
        'User-Agent': 'Live-Token-Generator/1.0'
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

async function getLiveToken() {
  console.log('🔑 Getting Live Server Token');
  console.log('=' .repeat(50));
  console.log(`🌐 Server: ${BASE_URL}`);
  console.log('=' .repeat(50));
  
  try {
    // Method 1: Try social login (usually works without OTP)
    console.log('\n1️⃣ Trying Social Login (Google)');
    console.log('-'.repeat(40));
    
    const socialLoginData = {
      email: `test.user.${Date.now()}@gmail.com`,
      fullName: 'Test User',
      loginType: 'GOOGLE',
      provider: 'google',
      providerId: `google_${Date.now()}`,
      profilePhoto: 'https://lh3.googleusercontent.com/a/default-user'
    };
    
    console.log(`📧 Email: ${socialLoginData.email}`);
    console.log(`👤 Name: ${socialLoginData.fullName}`);
    
    const socialResult = await makeRequest(
      `${BASE_URL}/users/social-login`,
      'POST',
      socialLoginData
    );
    
    console.log(`📊 Status: ${socialResult.status}`);
    
    if (socialResult.status === 200 && socialResult.data?.success) {
      const token = socialResult.data.data?.token || socialResult.data.token;
      const userId = socialResult.data.data?.user?.id || socialResult.data.user?.id;
      
      if (token) {
        console.log('\n🎉 SUCCESS! Token Generated');
        console.log('=' .repeat(50));
        console.log(`🔑 TOKEN: ${token}`);
        console.log(`👤 USER ID: ${userId}`);
        console.log(`📧 EMAIL: ${socialLoginData.email}`);
        console.log('=' .repeat(50));
        
        // Now test the heart-to-hearts endpoint with this token
        await testHeartToHeartsWithToken(token);
        return token;
      }
    } else {
      console.log(`❌ Social login failed: ${socialResult.raw}`);
    }
    
    // Method 2: Try creating a regular user (might need OTP)
    console.log('\n2️⃣ Trying Regular User Creation');
    console.log('-'.repeat(40));
    
    const testUser = {
      email: `test.${Date.now()}@example.com`,
      fullName: 'Test User',
      firstName: 'Test',
      lastName: 'User'
    };
    
    console.log(`📧 Email: ${testUser.email}`);
    
    const createResult = await makeRequest(
      `${BASE_URL}/users/create`,
      'POST',
      testUser
    );
    
    console.log(`📊 Status: ${createResult.status}`);
    console.log(`📄 Response: ${createResult.raw}`);
    
    if (createResult.status === 200 && createResult.data?.success) {
      console.log('✅ User created successfully');
      
      if (createResult.data.data?.token) {
        const token = createResult.data.data.token;
        console.log('\n🎉 SUCCESS! Token from user creation');
        console.log('=' .repeat(50));
        console.log(`🔑 TOKEN: ${token}`);
        console.log('=' .repeat(50));
        
        await testHeartToHeartsWithToken(token);
        return token;
      } else {
        console.log('⚠️  User created but OTP verification required');
        console.log('💡 Check your email for OTP and use verify-otp endpoint');
      }
    }
    
    // Method 3: Show manual instructions
    console.log('\n3️⃣ Manual Token Generation Instructions');
    console.log('=' .repeat(50));
    console.log('Since automatic token generation may require OTP verification,');
    console.log('here are manual methods to get a token:');
    console.log('');
    console.log('🔧 METHOD A - Use Postman:');
    console.log('1. Open Postman');
    console.log('2. POST to: https://pryve-backend.projectco.space/api/v1/users/social-login');
    console.log('3. Body (JSON):');
    console.log(JSON.stringify({
      email: "your.email@gmail.com",
      fullName: "Your Name",
      loginType: "GOOGLE",
      provider: "google",
      providerId: "google_12345",
      profilePhoto: "https://example.com/photo.jpg"
    }, null, 2));
    console.log('4. Copy token from response');
    console.log('');
    console.log('🔧 METHOD B - Use existing account:');
    console.log('1. POST to: https://pryve-backend.projectco.space/api/v1/users/login');
    console.log('2. Body: {"email": "your@email.com", "password": "yourpassword"}');
    console.log('3. Copy token from response');
    console.log('');
    console.log('🔧 METHOD C - Use frontend app:');
    console.log('1. Login to your frontend application');
    console.log('2. Open browser dev tools (F12)');
    console.log('3. Go to Application → Local Storage');
    console.log('4. Find and copy the JWT token');
    
    return null;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

async function testHeartToHeartsWithToken(token) {
  console.log('\n🧪 Testing Heart-to-Hearts Endpoint with Token');
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
        'Content-Type': 'application/json',
        'User-Agent': 'Heart-To-Hearts-Test/1.0'
      }
    };

    const result = await new Promise((resolve, reject) => {
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
    
    console.log(`📊 Status: ${result.status}`);
    
    if (result.status === 200) {
      console.log('✅ SUCCESS! Heart-to-Hearts endpoint response:');
      console.log('=' .repeat(50));
      console.log(JSON.stringify(result.data, null, 2));
      
      if (result.data?.data?.items) {
        const items = result.data.data.items;
        console.log(`\n📊 Summary: ${items.length} heart-to-hearts messages found`);
        
        if (items.length > 0) {
          console.log('\n📋 Sample Messages:');
          items.slice(0, 3).forEach((item, index) => {
            console.log(`${index + 1}. ${item.title || 'No title'}`);
            console.log(`   Content: ${item.content?.substring(0, 100) || 'No content'}...`);
            if (item.emotion) {
              console.log(`   Emotion: ${item.emotion.label} (${item.emotion.confidence})`);
            }
            console.log(`   Created: ${item.createdAt}`);
            console.log('');
          });
        }
      }
    } else {
      console.log(`❌ Failed: ${result.status}`);
      console.log(`📄 Response: ${result.raw}`);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

if (require.main === module) {
  getLiveToken().catch(console.error);
}

module.exports = { getLiveToken, testHeartToHeartsWithToken };