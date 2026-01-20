const axios = require('axios');

// Test configuration
const BASE_URL = 'https://pryve-backend.projectco.space';
const TEST_USER = {
    email: 'designercoo+1@gmail.com',
    password: '12345678a',
    fullName: 'Designer Coo'
};

async function createUser() {
    try {
        console.log('📝 Creating user:', TEST_USER.email);
        
        const createResponse = await axios.post(`${BASE_URL}/api/v1/users/create`, {
            email: TEST_USER.email,
            fullName: TEST_USER.fullName
        });

        console.log('✅ User creation response:', createResponse.data);
        return createResponse.data;
    } catch (error) {
        console.log('❌ User creation failed:', error.response?.data || error.message);
        return null;
    }
}

async function verifyOTP(otp = '123456') {
    try {
        console.log('🔐 Verifying OTP for:', TEST_USER.email);
        
        const verifyResponse = await axios.post(`${BASE_URL}/api/v1/users/verify-otp`, {
            email: TEST_USER.email,
            otp: otp
        });

        console.log('✅ OTP verification response:', verifyResponse.data);
        return verifyResponse.data;
    } catch (error) {
        console.log('❌ OTP verification failed:', error.response?.data || error.message);
        return null;
    }
}

async function loginUser() {
    try {
        console.log('🔐 Logging in user:', TEST_USER.email);
        
        const loginResponse = await axios.post(`${BASE_URL}/api/v1/users/login`, {
            email: TEST_USER.email,
            password: TEST_USER.password
        });

        if (loginResponse.data && loginResponse.data.token) {
            console.log('✅ Login successful!');
            console.log('🎫 Token:', loginResponse.data.token);
            return loginResponse.data.token;
        } else {
            console.log('❌ No token in login response:', loginResponse.data);
            return null;
        }
    } catch (error) {
        console.log('❌ Login failed:', error.response?.data || error.message);
        return null;
    }
}

async function testHeartToHeartsEndpoint(token) {
    try {
        console.log('\n🧪 Testing heart-to-hearts endpoint...');
        
        const endpoint = `${BASE_URL}/api/v1/chats/journey/messages?category=heart-to-hearts&limit=10`;
        console.log('📍 Endpoint:', endpoint);
        
        const response = await axios.get(endpoint, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Endpoint test successful!');
        console.log('📊 Status:', response.status);
        console.log('📋 Response data:');
        console.log(JSON.stringify(response.data, null, 2));
        
        return response.data;
    } catch (error) {
        console.log('❌ Endpoint test failed:');
        console.log('Status:', error.response?.status);
        console.log('Error:', error.response?.data || error.message);
        return null;
    }
}

async function testJourneyMainEndpoint(token) {
    try {
        console.log('\n🧪 Testing main journey endpoint...');
        
        const endpoint = `${BASE_URL}/api/v1/journey`;
        console.log('📍 Endpoint:', endpoint);
        
        const response = await axios.get(endpoint, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Journey endpoint test successful!');
        console.log('📊 Status:', response.status);
        console.log('📋 Response data:');
        console.log(JSON.stringify(response.data, null, 2));
        
        return response.data;
    } catch (error) {
        console.log('❌ Journey endpoint test failed:');
        console.log('Status:', error.response?.status);
        console.log('Error:', error.response?.data || error.message);
        return null;
    }
}

async function main() {
    console.log('🚀 Starting comprehensive endpoint test with correct API paths...\n');
    
    // Step 1: Try to login first
    let token = await loginUser();
    
    // Step 2: If login failed, try to create user
    if (!token) {
        console.log('\n📝 Login failed. Attempting to create user...');
        const createResult = await createUser();
        
        if (createResult) {
            console.log('\n🔐 User created. You may need to verify OTP manually.');
            console.log('💡 Check your email for OTP or try common OTPs like 123456');
            
            // Try some common OTPs
            const commonOTPs = ['123456', '000000', '111111'];
            for (const otp of commonOTPs) {
                console.log(`\n🔐 Trying OTP: ${otp}`);
                const verifyResult = await verifyOTP(otp);
                if (verifyResult) {
                    break;
                }
            }
            
            // Try login again
            console.log('\n🔐 Attempting login after user creation...');
            token = await loginUser();
        }
    }
    
    if (!token) {
        console.log('❌ Cannot proceed without token. Manual intervention may be required.');
        console.log('💡 Try logging in manually or check if OTP verification is needed.');
        return;
    }
    
    // Step 3: Test the endpoints
    console.log('\n' + '='.repeat(50));
    await testJourneyMainEndpoint(token);
    
    console.log('\n' + '='.repeat(50));
    await testHeartToHeartsEndpoint(token);
    
    console.log('\n✨ Test completed!');
    console.log('🎫 Token for future use:', token);
}

// Run the test
main().catch(console.error);