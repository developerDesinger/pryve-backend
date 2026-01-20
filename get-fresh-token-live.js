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
        'User-Agent': 'Token-Extractor/1.0'
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

async function attemptLogin() {
  console.log('🔐 Attempting login...');
  console.log(`📧 Email: ${USER_CREDENTIALS.email}`);
  
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
  console.log('\n🧪 Testing heart-to-hearts endpoint with fresh token...');
  
  try {
    const endpoint = `${BASE_URL}/api/v1/chats/journey/messages?category=heart-to-hearts&limit=10`;
    const result = await makeRequest(endpoint, 'GET', null, token);
    
    console.log(`📊 Endpoint Status: ${result.status}`);
    
    if (result.status === 200) {
      console.log('✅ ENDPOINT SUCCESS!');
      console.log('\n📋 Response:');
      console.log(JSON.stringify(result.data, null, 2));
      
      const items = result.data.data?.items || [];
      console.log(`\n📈 Items found: ${items.length}`);
      
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

async function createUserIfNeeded() {
  console.log('📝 Attempting to create user (in case it doesn\'t exist)...');
  
  try {
    const createUrl = `${BASE_URL}/api/v1/users/create`;
    const userData = {
      email: USER_CREDENTIALS.email,
      fullName: 'Designer Coo'
    };
    
    const result = await makeRequest(createUrl, 'POST', userData);
    
    console.log(`📊 Create Status: ${result.status}`);
    console.log('📋 Create Response:');
    console.log(JSON.stringify(result.data, null, 2));
    
    return result.data;
  } catch (error) {
    console.log('❌ Create error:', error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Getting Fresh Token for Live Server');
  console.log('=' .repeat(60));
  console.log(`🌐 Server: ${BASE_URL}`);
  console.log(`👤 User: ${USER_CREDENTIALS.email}`);
  console.log('=' .repeat(60));
  
  // Step 1: Try to login
  let token = await attemptLogin();
  
  // Step 2: If login failed, try to create user
  if (!token) {
    console.log('\n📝 Login failed. Trying to create user...');
    await createUserIfNeeded();
    
    console.log('\n💡 If user was created, you may need to:');
    console.log('   1. Check email for OTP');
    console.log('   2. Verify OTP manually');
    console.log('   3. Set password if needed');
    console.log('   4. Then run this script again');
    
    // Try login one more time
    console.log('\n🔐 Trying login again...');
    token = await attemptLogin();
  }
  
  // Step 3: Test endpoint if we have token
  if (token) {
    await testEndpointWithToken(token);
    
    console.log('\n🎉 SUCCESS! Use this token:');
    console.log('=' .repeat(60));
    console.log(token);
    console.log('=' .repeat(60));
  } else {
    console.log('\n❌ Could not obtain token. Manual intervention needed.');
    console.log('💡 Check if user exists and credentials are correct.');
  }
  
  console.log('\n✨ Token extraction completed!');
}

// Run the script
main().catch(console.error);