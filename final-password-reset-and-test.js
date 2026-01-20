const https = require('https');

// User credentials from previous responses
const USER_CREDENTIALS = {
    email: 'designercoo+1@gmail.com',
    userId: 'cmkk0m64p000fpea6p1sb9vfo', // From the create user response
    password: '12345678a',
    otp: '306723' // From the password reset response
};

const BASE_URL = 'https://pryve-backend.projectco.space';

function makeRequest(url, method = 'GET', data = null, token = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Final-Reset/1.0'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(responseData);
          resolve({
            status: res.statusCode,
            data: jsonData,
            raw: responseData
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: null,
            raw: responseData,
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
      reject(new Error('Request timeout (15s)'));
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function updatePassword() {
  console.log('🔐 Setting password with OTP...');
  
  try {
    const updateUrl = `${BASE_URL}/api/v1/users/update-password`;
    const result = await makeRequest(updateUrl, 'POST', {
      email: USER_CREDENTIALS.email,
      userId: USER_CREDENTIALS.userId,
      otp: USER_CREDENTIALS.otp,
      newPassword: USER_CREDENTIALS.password
    });
    
    console.log(`📊 Update Password Status: ${result.status}`);
    console.log('📋 Update Password Response:');
    console.log(JSON.stringify(result.data, null, 2));
    
    return result.data;
  } catch (error) {
    console.log('❌ Update password error:', error.message);
    return null;
  }
}

async function attemptLogin() {
  console.log('🔐 Attempting login...');
  
  try {
    const loginUrl = `${BASE_URL}/api/v1/users/login`;
    const result = await makeRequest(loginUrl, 'POST', {
      email: USER_CREDENTIALS.email,
      password: USER_CREDENTIALS.password
    });
    
    console.log(`📊 Login Status: ${result.status}`);
    
    if (result.status === 200 && result.data.token) {
      console.log('✅ LOGIN SUCCESS!');
      console.log(`🎫 Token: ${result.data.token}`);
      return result.data.token;
    } else {
      console.log('❌ Login failed:');
      console.log(JSON.stringify(result.data, null, 2));
      return null;
    }
  } catch (error) {
    console.log('❌ Login error:', error.message);
    return null;
  }
}

async function testHeartToHeartsEndpoint(token) {
  console.log('\n🧪 Testing heart-to-hearts endpoint...');
  
  try {
    const endpoint = `${BASE_URL}/api/v1/chats/journey/messages?category=heart-to-hearts&limit=10`;
    console.log(`🔗 ${endpoint}`);
    
    const result = await makeRequest(endpoint, 'GET', null, token);
    
    console.log(`📊 Endpoint Status: ${result.status}`);
    
    if (result.status === 200) {
      console.log('✅ ENDPOINT SUCCESS!');
      console.log('\n📋 Heart-to-Hearts Response:');
      console.log(JSON.stringify(result.data, null, 2));
      
      const items = result.data.data?.items || [];
      console.log(`\n📈 Heart-to-Hearts Items Found: ${items.length}`);
      
      if (items.length > 0) {
        console.log('\n🎉 Sample Messages:');
        items.slice(0, 3).forEach((item, index) => {
          console.log(`\n${index + 1}. ${item.title || 'No title'}`);
          console.log(`   Content: ${item.content?.substring(0, 100) || 'No content'}...`);
          if (item.emotion) {
            console.log(`   Emotion: ${item.emotion.label} (${item.emotion.confidence})`);
          }
          console.log(`   Created: ${item.createdAt}`);
        });
      } else {
        console.log('\n⚠️  No heart-to-hearts messages found (empty array)');
        console.log('💡 This means the endpoint works but user has no heart-to-hearts data');
      }
      
      return result.data;
    } else {
      console.log('❌ Endpoint failed:');
      console.log(JSON.stringify(result.data, null, 2));
      return null;
    }
  } catch (error) {
    console.log('❌ Endpoint error:', error.message);
    return null;
  }
}

async function testOtherCategories(token) {
  console.log('\n🔍 Testing other journey categories...');
  
  const categories = ['goals-achieved', 'growth-moments', 'breakthrough-days'];
  
  for (const category of categories) {
    try {
      const endpoint = `${BASE_URL}/api/v1/chats/journey/messages?category=${category}&limit=5`;
      console.log(`\n📂 Testing: ${category}`);
      
      const result = await makeRequest(endpoint, 'GET', null, token);
      const items = result.data?.data?.items || [];
      
      console.log(`   Status: ${result.status} | Items: ${items.length}`);
      
      if (items.length > 0) {
        console.log(`   ✅ Found ${items.length} ${category} messages`);
      }
    } catch (error) {
      console.log(`   ❌ Error testing ${category}: ${error.message}`);
    }
  }
}

async function main() {
  console.log('🚀 Final Password Reset and Endpoint Test');
  console.log('=' .repeat(60));
  console.log(`🌐 Server: ${BASE_URL}`);
  console.log(`👤 User: ${USER_CREDENTIALS.email}`);
  console.log(`🆔 User ID: ${USER_CREDENTIALS.userId}`);
  console.log(`🔑 OTP: ${USER_CREDENTIALS.otp}`);
  console.log('=' .repeat(60));
  
  // Step 1: Set password using OTP
  const updateResult = await updatePassword();
  
  if (updateResult && updateResult.success) {
    console.log('\n✅ Password set successfully!');
    
    // Step 2: Login with new password
    console.log('\n🔐 Logging in with new password...');
    const token = await attemptLogin();
    
    if (token) {
      // Step 3: Test the heart-to-hearts endpoint
      await testHeartToHeartsEndpoint(token);
      
      // Step 4: Test other categories
      await testOtherCategories(token);
      
      console.log('\n🎉 COMPLETE SUCCESS!');
      console.log('=' .repeat(60));
      console.log('🎫 Your Token for designercoo+1@gmail.com:');
      console.log(token);
      console.log('=' .repeat(60));
      
      console.log('\n📋 Test the endpoint manually:');
      console.log(`curl -H "Authorization: Bearer ${token}" "${BASE_URL}/api/v1/chats/journey/messages?category=heart-to-hearts&limit=10"`);
      
    } else {
      console.log('\n❌ Login failed after password reset');
    }
  } else {
    console.log('\n❌ Password update failed');
    console.log('💡 The OTP might be expired or the userId might be incorrect');
  }
  
  console.log('\n✨ Process completed!');
}

// Run the script
main().catch(console.error);