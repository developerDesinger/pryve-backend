const axios = require('axios');

// Test configuration
const BASE_URL = 'https://pryve-backend.projectco.space';
const TEST_USER = {
    email: 'designercoo+1@gmail.com',
    password: '12345678a'
};

async function getAuthToken() {
    try {
        console.log('🔐 Getting auth token for:', TEST_USER.email);
        
        const loginResponse = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
            email: TEST_USER.email,
            password: TEST_USER.password
        });

        if (loginResponse.data && loginResponse.data.token) {
            console.log('✅ Token obtained successfully');
            console.log('Token:', loginResponse.data.token);
            return loginResponse.data.token;
        } else {
            console.log('❌ No token in response:', loginResponse.data);
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
        console.log('Endpoint:', endpoint);
        
        const response = await axios.get(endpoint, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Endpoint test successful!');
        console.log('Status:', response.status);
        console.log('Response data:', JSON.stringify(response.data, null, 2));
        
        return response.data;
    } catch (error) {
        console.log('❌ Endpoint test failed:', error.response?.status, error.response?.data || error.message);
        return null;
    }
}

async function main() {
    console.log('🚀 Starting live endpoint test...\n');
    
    // Step 1: Get auth token
    const token = await getAuthToken();
    
    if (!token) {
        console.log('❌ Cannot proceed without token');
        return;
    }
    
    // Step 2: Test the heart-to-hearts endpoint
    await testHeartToHeartsEndpoint(token);
    
    console.log('\n✨ Test completed!');
}

// Run the test
main().catch(console.error);