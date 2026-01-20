const https = require('https');

// User credentials
const USER_CREDENTIALS = {
    email: 'designercoo+1@gmail.com',
    password: '12345678a'
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
        'User-Agent': 'Password-Reset/1.0'
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

async function resetPassword() {
  console.log('🔄 Attempting password reset...');
  
  try {
    const resetUrl = `${BASE_URL}/api/v1/users/forgot-password`;
    const result = await makeRequest(resetUrl, 'POST', { email: USER_CREDENTIALS.email });
    
    console.log(`📊 Reset Status: ${result.status}`);
    console.log('📋 Reset Response:');
    console.log(JSON.stringify(result.data, null, 2));
    
    return result.data;
  } catch (error) {
    console.log('❌ Reset error:', error.message);
    return null;
  }
}

async function setPassword(resetToken, newPassword) {
  console.log('🔐 Attempting to set new password...');
  
  try {
    const setPasswordUrl = `${BASE_URL}/api/v1/users/reset-password`;
    const result = await makeRequest(setPasswordUrl, 'POST', {
      token: resetToken,
      password: newPassword
    });
    
    console.log(`📊 Set Password Status: ${result.status}`);
    console.log('📋 Set Password Response:');
    console.log(JSON.stringify(result.data, null, 2));
    
    return result.data;
  } catch (error) {
    console.log('❌ Set password error:', error.message);
    return null;
  }
}

async function attemptLogin() {
  console.log('🔐 Attempting login...');
  
  try {
    const loginUrl = `${BASE_URL}/api/v1/users/login`;
    const result = await makeRequest(loginUrl, 'POST', USER_CREDENTIALS);
    
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

async function testEndpointWithToken(token) {
  console.log('\n🧪 Testing heart-to-hearts endpoint...');
  
  try {
    const endpoint = `${BASE_URL}/api/v1/chats/journey/messages?category=heart-to-hearts&limit=10`;
    const result = await makeRequest(endpoint, 'GET', null, token);
    
    console.log(`📊 Endpoint Status: ${result.status}`);
    
    if (result.status === 200) {
      console.log('✅ ENDPOINT SUCCESS!');
      console.log('\n📋 Heart-to-Hearts Response:');
      console.log(JSON.stringify(result.data, null, 2));
      
      const items = result.data.data?.items || [];
      console.log(`\n📈 Heart-to-Hearts Items: ${items.length}`);
      
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

async function main() {
  console.log('🚀 Password Reset and Token Extraction');
  console.log('=' .repeat(60));
  console.log(`🌐 Server: ${BASE_URL}`);
  console.log(`👤 User: ${USER_CREDENTIALS.email}`);
  console.log('=' .repeat(60));
  
  // Step 1: Try login first
  let token = await attemptLogin();
  
  if (!token) {
    // Step 2: Try password reset
    console.log('\n🔄 Login failed. Attempting password reset...');
    const resetResult = await resetPassword();
    
    if (resetResult && resetResult.success) {
      console.log('\n💡 Password reset email sent!');
      console.log('📧 Check your email for reset instructions.');
      console.log('🔗 Look for a reset link or token in the email.');
      console.log('\n⚠️  Manual step required:');
      console.log('   1. Check email for reset token');
      console.log('   2. Use the token to set new password');
      console.log('   3. Then run login again');
    } else {
      console.log('\n❌ Password reset failed or not available.');
    }
    
    // Try login one more time
    console.log('\n🔐 Trying login again (in case password was already set)...');
    token = await attemptLogin();
  }
  
  // Step 3: Test endpoint if we have token
  if (token) {
    await testEndpointWithToken(token);
    
    console.log('\n🎉 SUCCESS! Token extracted:');
    console.log('=' .repeat(60));
    console.log(token);
    console.log('=' .repeat(60));
    
    console.log('\n📋 Use this token to test the endpoint:');
    console.log(`curl -H "Authorization: Bearer ${token}" "${BASE_URL}/api/v1/chats/journey/messages?category=heart-to-hearts&limit=10"`);
  } else {
    console.log('\n❌ Could not obtain token.');
    console.log('💡 Try these manual steps:');
    console.log('   1. Check if password reset email was sent');
    console.log('   2. Use reset link to set password');
    console.log('   3. Run this script again');
  }
  
  console.log('\n✨ Process completed!');
}

// Run the script
main().catch(console.error);