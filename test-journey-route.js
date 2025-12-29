/**
 * Test script for the /journey route to identify the internal server error
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3400/api/v1'; // Using port from .env

async function testJourneyRoute() {
  console.log('🧪 Testing Journey Route\n');
  
  try {
    // Use the provided token directly
    console.log('🔑 Using provided token...');
    
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtZ2dxbmx2ajAwMDB1amRnZWJxdGR6dnYiLCJyb2xlIjoiQ0xJRU5UIiwiaWF0IjoxNzY2NjUwOTIwLCJleHAiOjE3NjcyNTU3MjB9.qK_sk_MDN6WbX7klt-cNv2tAD32TdMu2W9ILIVrIknM';
    
    console.log('✅ Token ready');
    
    // Now test the journey route
    console.log('\n🚀 Testing /journey route...');
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    try {
      const journeyResponse = await axios.get(`${BASE_URL}/journey`, { headers });
      console.log('✅ Journey route successful!');
      console.log('📊 Response data keys:', Object.keys(journeyResponse.data));
      
      if (journeyResponse.data.data) {
        console.log('📊 Journey data keys:', Object.keys(journeyResponse.data.data));
      }
      
    } catch (journeyError) {
      console.log('❌ Journey route failed!');
      console.log('📊 Status:', journeyError.response?.status);
      console.log('📊 Error message:', journeyError.response?.data?.message || journeyError.message);
      console.log('📊 Full error response:', JSON.stringify(journeyError.response?.data, null, 2));
      
      // If it's a 500 error, let's also test the journey messages route
      if (journeyError.response?.status === 500) {
        console.log('\n🧪 Testing /journey/messages route...');
        try {
          const messagesResponse = await axios.get(`${BASE_URL}/journey/messages?category=goals-achieved`, { headers });
          console.log('✅ Journey messages route successful!');
          console.log('📊 Messages response keys:', Object.keys(messagesResponse.data));
        } catch (messagesError) {
          console.log('❌ Journey messages route also failed:', messagesError.response?.data?.message || messagesError.message);
          console.log('📊 Messages error response:', JSON.stringify(messagesError.response?.data, null, 2));
        }
      }
    }
    
  } catch (error) {
    console.log('❌ General error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Make sure your server is running on port 3400: npm start');
    }
  }
}

// Run the test
if (require.main === module) {
  testJourneyRoute().catch(console.error);
}

module.exports = { testJourneyRoute };