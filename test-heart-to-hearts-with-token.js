const axios = require('axios');

// Your JWT token
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtanBqN2IxdzAwMGhwZWp0b2R6cDN2YjUiLCJyb2xlIjoiQ0xJRU5UIiwiaWF0IjoxNzY5NTMwNDA2LCJleHAiOjE3NzAxMzUyMDZ9.YL9ecIiGK6kTLdEJEIcZOef_I8XB02laaKP37tqd7Mk';

// Test configuration
const BASE_URL = 'http://localhost:3000'; // Change to your server URL
const LIVE_URL = 'https://pryve-backend-production.up.railway.app'; // Production URL

async function testHeartToHeartsAPI() {
    console.log('🧪 Testing Heart-to-Hearts API with your token...\n');
    
    // Test both local and production
    const urls = [
        { name: 'Local', url: BASE_URL },
        { name: 'Production', url: LIVE_URL }
    ];
    
    for (const { name, url } of urls) {
        console.log(`\n📍 Testing ${name} server: ${url}`);
        console.log('=' .repeat(50));
        
        try {
            // Test heart-to-hearts endpoint
            const response = await axios.get(`${url}/api/v1/heart-to-hearts`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });
            
            console.log(`✅ ${name} Heart-to-Hearts API Response:`);
            console.log(`Status: ${response.status}`);
            console.log(`Data:`, JSON.stringify(response.data, null, 2));
            
        } catch (error) {
            console.log(`❌ ${name} Heart-to-Hearts API Error:`);
            if (error.response) {
                console.log(`Status: ${error.response.status}`);
                console.log(`Error:`, error.response.data);
            } else if (error.request) {
                console.log('No response received - server might be down');
            } else {
                console.log('Error:', error.message);
            }
        }
    }
}

// Run the test
testHeartToHeartsAPI().catch(console.error);