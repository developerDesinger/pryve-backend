/**
 * Get Token Now - Quick token generator for testing
 */

const http = require('http');

const BASE_URL = 'http://localhost:3400/api/v1';

function makeRequest(url, method, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = data ? JSON.stringify(data) : null;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Token-Generator/1.0'
      }
    };

    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
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
    
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

async function getTokenNow() {
  console.log('🔑 Getting Token for Postman Testing');
  console.log('=' .repeat(50));
  
  try {
    // Try social login approach (usually works without OTP)
    console.log('1️⃣ Trying social login...');
    
    const socialLoginData = {
      email: 'speedtest@postman.com',
      fullName: 'Postman Test User',
      loginType: 'GOOGLE',
      provider: 'google',
      providerId: `google_${Date.now()}`,
      profilePhoto: 'https://example.com/photo.jpg'
    };
    
    const socialResult = await makeRequest(
      `${BASE_URL}/users/social-login`,
      'POST',
      socialLoginData
    );
    
    console.log('Social login response:', socialResult.status);
    
    if (socialResult.status === 200 && socialResult.data?.success) {
      const token = socialResult.data.data?.token || socialResult.data.token;
      const userId = socialResult.data.data?.user?.id || socialResult.data.user?.id;
      
      if (token) {
        console.log('\n🎉 SUCCESS! Token Created');
        console.log('=' .repeat(50));
        console.log(`🔑 TOKEN: ${token}`);
        console.log(`👤 USER ID: ${userId}`);
        console.log(`📧 EMAIL: ${socialLoginData.email}`);
        console.log('=' .repeat(50));
        console.log('\n📋 COPY THIS TOKEN FOR POSTMAN:');
        console.log(`${token}`);
        console.log('\n🔧 How to use in Postman:');
        console.log('1. Open Postman');
        console.log('2. Go to Environment (top right)');
        console.log('3. Set auth_token = ' + token);
        console.log('4. Or manually paste in Authorization header');
        
        return token;
      }
    }
    
    console.log('❌ Social login failed:', socialResult.raw);
    
    // Try alternative approach - create user without OTP
    console.log('\n2️⃣ Trying direct user creation...');
    
    const testUser = {
      email: `test${Date.now()}@postman.com`,
      password: 'TestPassword123!',
      fullName: 'Postman Test User',
      firstName: 'Postman',
      lastName: 'Test'
    };
    
    const createResult = await makeRequest(
      `${BASE_URL}/users/create`,
      'POST',
      testUser
    );
    
    console.log('User creation response:', createResult.status);
    console.log('Response:', createResult.raw);
    
    // If user creation requires OTP, show manual instructions
    console.log('\n💡 MANUAL TOKEN GENERATION:');
    console.log('=' .repeat(50));
    console.log('Since automatic token generation requires OTP verification,');
    console.log('here are 3 ways to get a token manually:');
    console.log('');
    console.log('🔧 METHOD 1 - Use existing user:');
    console.log('1. If you have an existing account, use Postman login endpoint');
    console.log('2. POST /users/login with your email/password');
    console.log('3. Copy token from response');
    console.log('');
    console.log('🔧 METHOD 2 - Use your frontend app:');
    console.log('1. Login to your frontend app');
    console.log('2. Open browser dev tools (F12)');
    console.log('3. Go to Application/Storage → Local Storage');
    console.log('4. Find and copy the JWT token');
    console.log('');
    console.log('🔧 METHOD 3 - Create user via frontend:');
    console.log('1. Register new user via your frontend');
    console.log('2. Complete OTP verification');
    console.log('3. Copy token from login response');
    
    return null;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    console.log('\n💡 TROUBLESHOOTING:');
    console.log('1. Make sure server is running: npm run dev');
    console.log('2. Check server is on port 3400');
    console.log('3. Try manual login via Postman');
    
    return null;
  }
}

if (require.main === module) {
  getTokenNow().catch(console.error);
}

module.exports = { getTokenNow };