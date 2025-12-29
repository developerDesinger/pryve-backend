/**
 * Debug script for journey messages endpoint
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3400/api/v1';
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtZ2dxbmx2ajAwMDB1amRnZWJxdGR6dnYiLCJyb2xlIjoiQ0xJRU5UIiwiaWF0IjoxNzY2NjUwOTIwLCJleHAiOjE3NjcyNTU3MjB9.qK_sk_MDN6WbX7klt-cNv2tAD32TdMu2W9ILIVrIknM';

const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};

async function debugJourneyMessages() {
  console.log('🔍 Debugging Journey Messages Endpoints\n');

  // Test both endpoint paths
  const endpoints = [
    {
      name: 'Direct Journey Route',
      url: `${BASE_URL}/journey/messages?category=goals-achieved&limit=10`
    },
    {
      name: 'Chat Journey Route', 
      url: `${BASE_URL}/chats/journey/messages?category=goals-achieved&limit=10`
    }
  ];

  for (const endpoint of endpoints) {
    console.log(`\n🧪 Testing: ${endpoint.name}`);
    console.log(`📍 URL: ${endpoint.url}`);
    
    try {
      const response = await axios.get(endpoint.url, { headers });
      console.log('✅ Success!');
      console.log('📊 Status:', response.status);
      console.log('📊 Response keys:', Object.keys(response.data));
      
      if (response.data.data) {
        console.log('📊 Data keys:', Object.keys(response.data.data));
        console.log('📊 Items count:', response.data.data.items?.length || 0);
        
        if (response.data.data.items?.length > 0) {
          console.log('📊 First item keys:', Object.keys(response.data.data.items[0]));
        } else {
          console.log('⚠️  No items found in response');
        }
      }
      
    } catch (error) {
      console.log('❌ Failed!');
      console.log('📊 Status:', error.response?.status);
      console.log('📊 Error:', error.response?.data?.message || error.message);
      console.log('📊 Full error:', JSON.stringify(error.response?.data, null, 2));
    }
  }

  // Test different categories
  console.log('\n🧪 Testing Different Categories:');
  const categories = ['goals-achieved', 'breakthrough-days', 'growth-moments', 'heart-to-hearts'];
  
  for (const category of categories) {
    console.log(`\n📂 Testing category: ${category}`);
    try {
      const response = await axios.get(
        `${BASE_URL}/journey/messages?category=${category}&limit=5`, 
        { headers }
      );
      console.log(`✅ ${category}: ${response.data.data?.items?.length || 0} items`);
    } catch (error) {
      console.log(`❌ ${category}: ${error.response?.data?.message || error.message}`);
    }
  }

  // Test the working /journey endpoint for comparison
  console.log('\n🧪 Testing Working /journey Endpoint:');
  try {
    const response = await axios.get(`${BASE_URL}/journey`, { headers });
    console.log('✅ /journey endpoint works!');
    console.log('📊 Response keys:', Object.keys(response.data));
    if (response.data.data) {
      console.log('📊 Data keys:', Object.keys(response.data.data));
      console.log('📊 Recent messages count:', response.data.data.recentMessages?.length || 0);
      console.log('📊 Favorite messages count:', response.data.data.favoriteMessages?.length || 0);
      console.log('📊 Statistics:', response.data.data.statistics);
    }
  } catch (error) {
    console.log('❌ /journey endpoint failed:', error.response?.data?.message || error.message);
  }
}

// Run the debug
if (require.main === module) {
  debugJourneyMessages().catch(console.error);
}

module.exports = { debugJourneyMessages };