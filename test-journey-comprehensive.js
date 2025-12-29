/**
 * Comprehensive test script for the /journey route with various parameters
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3400/api/v1';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtZ2dxbmx2ajAwMDB1amRnZWJxdGR6dnYiLCJyb2xlIjoiQ0xJRU5UIiwiaWF0IjoxNzY2NjUwOTIwLCJleHAiOjE3NjcyNTU3MjB9.qK_sk_MDN6WbX7klt-cNv2tAD32TdMu2W9ILIVrIknM';

async function testJourneyWithParams() {
  console.log('🧪 Comprehensive Journey Route Testing\n');
  
  const headers = {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json'
  };

  const testCases = [
    {
      name: 'Basic journey route',
      url: `${BASE_URL}/journey`
    },
    {
      name: 'Journey with favoriteLimit',
      url: `${BASE_URL}/journey?favoriteLimit=5`
    },
    {
      name: 'Journey with chatLimit',
      url: `${BASE_URL}/journey?chatLimit=3`
    },
    {
      name: 'Journey with messageLimit',
      url: `${BASE_URL}/journey?messageLimit=5`
    },
    {
      name: 'Journey with vaultLimit',
      url: `${BASE_URL}/journey?vaultLimit=10`
    },
    {
      name: 'Journey with all limits',
      url: `${BASE_URL}/journey?favoriteLimit=5&chatLimit=3&messageLimit=5&vaultLimit=10`
    },
    {
      name: 'Journey with high limits',
      url: `${BASE_URL}/journey?favoriteLimit=100&chatLimit=50&messageLimit=100&vaultLimit=100`
    },
    {
      name: 'Journey messages - goals-achieved',
      url: `${BASE_URL}/journey/messages?category=goals-achieved`
    },
    {
      name: 'Journey messages - breakthrough-days',
      url: `${BASE_URL}/journey/messages?category=breakthrough-days`
    },
    {
      name: 'Journey messages - growth-moments',
      url: `${BASE_URL}/journey/messages?category=growth-moments`
    },
    {
      name: 'Journey messages - heart-to-hearts',
      url: `${BASE_URL}/journey/messages?category=heart-to-hearts`
    },
    {
      name: 'Journey messages with limit',
      url: `${BASE_URL}/journey/messages?category=goals-achieved&limit=5`
    },
    {
      name: 'Journey messages with cursor',
      url: `${BASE_URL}/journey/messages?category=goals-achieved&cursor=test123`
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n🧪 Testing: ${testCase.name}`);
    console.log(`📍 URL: ${testCase.url}`);
    
    try {
      const response = await axios.get(testCase.url, { headers });
      console.log(`✅ Success - Status: ${response.status}`);
      
      if (response.data.data) {
        const dataKeys = Object.keys(response.data.data);
        console.log(`📊 Data keys: ${dataKeys.join(', ')}`);
        
        // Check for specific data structures
        if (response.data.data.journeyOverview) {
          console.log(`📈 Journey Overview: ${JSON.stringify(response.data.data.journeyOverview)}`);
        }
        if (response.data.data.statistics) {
          console.log(`📊 Statistics: ${JSON.stringify(response.data.data.statistics)}`);
        }
        if (response.data.data.items) {
          console.log(`📝 Items count: ${response.data.data.items.length}`);
        }
      }
      
    } catch (error) {
      console.log(`❌ Failed - Status: ${error.response?.status}`);
      console.log(`📊 Error: ${error.response?.data?.message || error.message}`);
      
      if (error.response?.status === 500) {
        console.log(`🔍 Full error response:`, JSON.stringify(error.response?.data, null, 2));
      }
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// Run the comprehensive test
if (require.main === module) {
  testJourneyWithParams().catch(console.error);
}

module.exports = { testJourneyWithParams };