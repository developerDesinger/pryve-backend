const axios = require('axios');

// Test configuration
const BASE_URL = 'https://pryve-backend.projectco.space';
const TEST_USER = {
    email: 'designercoo+1@gmail.com',
    password: '12345678a',
    firstName: 'Designer',
    lastName: 'Coo'
};

async function registerUser() {
    try {
        console.log('📝 Attempting to register user:', TEST_USER.email);
        
        const registerResponse = await axios.post(`${BASE_URL}/api/v1/auth/register`, {
            email: TEST_USER.email,
            password: TEST_USER.password,
            firstName: TEST_USER.firstName,
            lastName: TEST_USER.lastName
        });

        console.log('✅ Registration response:', registerResponse.data);
        return registerResponse.data;
    } catch (error) {
        console.log('❌ Registration failed:', error.response?.data || error.message);
        return null;
    }
}

async function loginUser() {
    try {
        console.log('🔐 Attempting login for:', TEST_USER.email);
        
        const loginResponse = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
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

async function checkUserExists() {
    try {
        console.log('🔍 Checking if user exists by attempting login...');
        const token = await loginUser();
        return token !== null;
    } catch (error) {
        return false;
    }
}

async function main() {
    console.log('🚀 Starting comprehensive endpoint test...\n');
    
    // Step 1: Check if user exists
    let token = await loginUser();
    
    // Step 2: If login failed, try to register
    if (!token) {
        console.log('\n📝 User doesn\'t exist or login failed. Attempting registration...');
        await registerUser();
        
        // Try login again after registration
        console.log('\n🔐 Attempting login after registration...');
        token = await loginUser();
    }
    
    if (!token) {
        console.log('❌ Cannot proceed without token. Check credentials or server status.');
        return;
    }
    
    // Step 3: Test the heart-to-hearts endpoint
    console.log('\n' + '='.repeat(50));
    await testHeartToHeartsEndpoint(token);
    
    console.log('\n✨ Test completed!');
    console.log('🎫 Final token for future use:', token);
}

// Run the test
main().catch(console.error);