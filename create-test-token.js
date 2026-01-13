/**
 * Create Test Token - Generate a fresh JWT token for testing
 */

const https = require('https');
const http = require('http');

const BASE_URL = 'http://localhost:3400/api/v1'; // Updated to correct port

function makeRequest(url, method, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = data ? JSON.stringify(data) : null;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Token-Creator/1.0'
      }
    };

    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const protocol = urlObj.protocol === 'https:' ? https : http;
    const req = protocol.request(options, (res) => {
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
      reject(new Error('Request timeout (10s)'));
    });
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

async function createTestToken() {
  console.log('🔑 Creating Test Token');
  console.log('=' .repeat(50));
  console.log(`🌐 Server: ${BASE_URL}`);
  
  try {
    // Try to register a test user first
    const testEmail = `speedtest${Date.now()}@test.com`;
    const testPassword = 'TestPassword123!';
    
    console.log('\n1️⃣ Creating test user...');
    console.log(`📧 Email: ${testEmail}`);
    
    const registerResult = await makeRequest(
      `${BASE_URL}/auth/register`,
      'POST',
      {
        email: testEmail,
        password: testPassword,
        firstName: 'Speed',
        lastName: 'Test',
        userName: `speedtest${Date.now()}`
      }
    );
    
    let token = null;
    let userId = null;
    
    if (registerResult.status === 201 || registerResult.status === 200) {
      console.log('✅ User created successfully');
      token = registerResult.data.data?.token || registerResult.data.token;
      userId = registerResult.data.data?.user?.id || registerResult.data.user?.id;
    } else {
      console.log(`⚠️  Registration failed (${registerResult.status}), trying login...`);
      
      // If registration fails, try to login with existing user
      const loginResult = await makeRequest(
        `${BASE_URL}/auth/login`,
        'POST',
        {
          email: testEmail,
          password: testPassword
        }
      );
      
      if (loginResult.status === 200) {
        console.log('✅ Logged in successfully');
        token = loginResult.data.data?.token || loginResult.data.token;
        userId = loginResult.data.data?.user?.id || loginResult.data.user?.id;
      } else {
        // Try with a default test user
        console.log('⚠️  Login failed, trying default test user...');
        const defaultLoginResult = await makeRequest(
          `${BASE_URL}/auth/login`,
          'POST',
          {
            email: 'test@test.com',
            password: 'password123'
          }
        );
        
        if (defaultLoginResult.status === 200) {
          console.log('✅ Logged in with default user');
          token = defaultLoginResult.data.data?.token || defaultLoginResult.data.token;
          userId = defaultLoginResult.data.data?.user?.id || defaultLoginResult.data.user?.id;
        } else {
          console.log('❌ All login attempts failed');
          console.log('Default login response:', defaultLoginResult.raw);
          return null;
        }
      }
    }
    
    if (token) {
      console.log('\n2️⃣ Token Created Successfully!');
      console.log('=' .repeat(50));
      console.log(`🔑 Token: ${token}`);
      console.log(`👤 User ID: ${userId}`);
      console.log(`📧 Email: ${testEmail}`);
      console.log('=' .repeat(50));
      
      return {
        token,
        userId,
        email: testEmail
      };
    } else {
      console.log('❌ Failed to get token');
      return null;
    }
    
  } catch (error) {
    console.error('❌ Error creating token:', error.message);
    return null;
  }
}

if (require.main === module) {
  createTestToken().then(result => {
    if (result) {
      console.log('\n🎉 Success! Use this token for testing:');
      console.log(`TOKEN = '${result.token}';`);
    } else {
      console.log('\n❌ Failed to create token. Check server logs.');
    }
  }).catch(console.error);
}

module.exports = { createTestToken };