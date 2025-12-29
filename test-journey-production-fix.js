/**
 * Test script to verify the journey route fix for production
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3400/api/v1';

async function testJourneyProductionFix() {
  console.log('🧪 Testing Journey Route Production Fix\n');
  
  try {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtZ2dxbmx2ajAwMDB1amRnZWJxdGR6dnYiLCJyb2xlIjoiQ0xJRU5UIiwiaWF0IjoxNzY2NjUwOTIwLCJleHAiOjE3NjcyNTU3MjB9.qK_sk_MDN6WbX7klt-cNv2tAD32TdMu2W9ILIVrIknM';
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    console.log('🚀 Testing /journey route...');
    
    const journeyResponse = await axios.get(`${BASE_URL}/journey`, { headers });
    console.log('✅ Journey route successful!');
    console.log('📊 Response status:', journeyResponse.status);
    console.log('📊 Response data keys:', Object.keys(journeyResponse.data));
    
    if (journeyResponse.data.data) {
      console.log('📊 Journey data keys:', Object.keys(journeyResponse.data.data));
      
      // Check statistics specifically
      if (journeyResponse.data.data.statistics) {
        console.log('📊 Statistics keys:', Object.keys(journeyResponse.data.data.statistics));
        console.log('📊 Growth Moments count:', journeyResponse.data.data.statistics.growthMoments);
      }
      
      // Check journey overview
      if (journeyResponse.data.data.journeyOverview) {
        console.log('📊 Journey Overview keys:', Object.keys(journeyResponse.data.data.journeyOverview));
        
        if (journeyResponse.data.data.journeyOverview.growthMoments) {
          console.log('📊 Growth Moments in overview:', {
            count: journeyResponse.data.data.journeyOverview.growthMoments.count,
            itemsLength: journeyResponse.data.data.journeyOverview.growthMoments.items?.length
          });
        }
      }
    }
    
    console.log('\n✅ All tests passed! No undefined variable errors.');
    
  } catch (error) {
    console.log('❌ Journey route failed!');
    console.log('📊 Status:', error.response?.status);
    console.log('📊 Error message:', error.response?.data?.message || error.message);
    console.log('📊 Full error response:', JSON.stringify(error.response?.data, null, 2));
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Make sure your server is running on port 3400');
    }
  }
}

// Run the test
if (require.main === module) {
  testJourneyProductionFix().catch(console.error);
}

module.exports = { testJourneyProductionFix };