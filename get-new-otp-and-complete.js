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
        'User-Agent': 'New-OTP/1.0'
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

async function requestNewOTP() {
  console.log('📧 Requesting new OTP...');
  
  try {
    // Try resend OTP endpoint
    const resendUrl = `${BASE_URL}/api/v1/users/resend-otp`;
    const result = await makeRequest(resendUrl, 'POST', {
      email: USER_CREDENTIALS.email
    });
    
    console.log(`📊 Resend OTP Status: ${result.status}`);
    console.log('📋 Resend OTP Response:');
    console.log(JSON.stringify(result.data, null, 2));
    
    // Extract OTP from response if available
    if (result.data && result.data.data && result.data.data.otp) {
      console.log(`🔑 New OTP: ${result.data.data.otp}`);
      return result.data.data.otp;
    }
    
    return null;
  } catch (error) {
    console.log('❌ Resend OTP error:', error.message);
    return null;
  }
}

async function verifyOTP(otp) {
  console.log(`🔐 Verifying OTP: ${otp}`);
  
  try {
    const verifyUrl = `${BASE_URL}/api/v1/users/verify-otp`;
    const result = await makeRequest(verifyUrl, 'POST', {
      email: USER_CREDENTIALS.email,
      otp: otp
    });
    
    console.log(`📊 Verify OTP Status: ${result.status}`);
    console.log('📋 Verify OTP Response:');
    console.log(JSON.stringify(result.data, null, 2));
    
    return result.data;
  } catch (error) {
    console.log('❌ Verify OTP error:', error.message);
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

async function main() {
  console.log('🚀 Get New OTP and Complete Authentication');
  console.log('=' .repeat(60));
  console.log(`🌐 Server: ${BASE_URL}`);
  console.log(`👤 User: ${USER_CREDENTIALS.email}`);
  console.log('=' .repeat(60));
  
  // Step 1: Request new OTP
  const newOTP = await requestNewOTP();
  
  if (newOTP) {
    console.log(`\n✅ New OTP received: ${newOTP}`);
    
    // Step 2: Verify the new OTP
    const verifyResult = await verifyOTP(newOTP);
    
    if (verifyResult && verifyResult.success) {
      console.log('\n✅ OTP verified and account activated!');
      
      // Step 3: Login with password
      console.log('\n🔐 Logging in...');
      const token = await attemptLogin();
      
      if (token) {
        // Step 4: Test the heart-to-hearts endpoint
        await testHeartToHeartsEndpoint(token);
        
        console.log('\n🎉 COMPLETE SUCCESS!');
        console.log('=' .repeat(60));
        console.log('🎫 Your Token for designercoo+1@gmail.com:');
        console.log(token);
        console.log('=' .repeat(60));
        
        console.log('\n📋 Test the endpoint manually:');
        console.log(`curl -H "Authorization: Bearer ${token}" "${BASE_URL}/api/v1/chats/journey/messages?category=heart-to-hearts&limit=10"`);
        
      } else {
        console.log('\n❌ Login failed after OTP verification');
      }
    } else {
      console.log('\n❌ OTP verification failed');
    }
  } else {
    console.log('\n❌ Could not get new OTP');
    console.log('💡 Try manually checking email or using a different approach');
  }
  
  console.log('\n✨ Process completed!');
}

// Run the script
main().catch(console.error);