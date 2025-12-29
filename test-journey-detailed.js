/**
 * Detailed test of journey messages endpoints with full response data
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3400/api/v1';
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtZ2dxbmx2ajAwMDB1amRnZWJxdGR6dnYiLCJyb2xlIjoiQ0xJRU5UIiwiaWF0IjoxNzY2NjUwOTIwLCJleHAiOjE3NjcyNTU3MjB9.qK_sk_MDN6WbX7klt-cNv2tAD32TdMu2W9ILIVrIknM';

const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};

async function testJourneyDetailed() {
  console.log('🔍 Detailed Journey Messages Test\n');

  // Test both endpoint paths with different categories
  const tests = [
    {
      name: 'Direct Route - Goals Achieved',
      url: `${BASE_URL}/journey/messages?category=goals-achieved&limit=10`
    },
    {
      name: 'Chat Route - Goals Achieved', 
      url: `${BASE_URL}/chats/journey/messages?category=goals-achieved&limit=10`
    },
    {
      name: 'Heart to Hearts',
      url: `${BASE_URL}/journey/messages?category=heart-to-hearts&limit=10`
    },
    {
      name: 'Growth Moments',
      url: `${BASE_URL}/journey/messages?category=growth-moments&limit=10`
    },
    {
      name: 'Breakthrough Days',
      url: `${BASE_URL}/journey/messages?category=breakthrough-days&limit=10`
    }
  ];

  for (const test of tests) {
    console.log(`\n🧪 Testing: ${test.name}`);
    console.log(`📍 URL: ${test.url}`);
    
    try {
      const response = await axios.get(test.url, { headers });
      console.log('✅ Success!');
      console.log('📊 Status:', response.status);
      console.log('📊 Category:', response.data.data.category);
      console.log('📊 Items count:', response.data.data.items.length);
      
      if (response.data.data.items.length > 0) {
        console.log('\n📋 Sample Items:');
        response.data.data.items.forEach((item, index) => {
          console.log(`\n  ${index + 1}. ${item.title}`);
          console.log(`     Summary: ${item.summary}`);
          console.log(`     Tags: ${item.tags?.join(', ') || 'none'}`);
          console.log(`     Duration: ${item.duration}`);
          console.log(`     Emotion: ${item.emotion?.label} (${item.emotion?.confidence})`);
          if (item.highlightMessage) {
            console.log(`     Highlight: "${item.highlightMessage.content.substring(0, 80)}..."`);
          }
        });
      } else {
        console.log('⚠️  No items found');
      }
      
    } catch (error) {
      console.log('❌ Failed!');
      console.log('📊 Status:', error.response?.status);
      console.log('📊 Error:', error.response?.data?.message || error.message);
    }
  }

  // Test the main journey endpoint for comparison
  console.log('\n\n🧪 Testing Main Journey Endpoint:');
  try {
    const response = await axios.get(`${BASE_URL}/journey`, { headers });
    console.log('✅ Success!');
    console.log('📊 Statistics:', JSON.stringify(response.data.data.statistics, null, 2));
    
    if (response.data.data.recentGoals?.length > 0) {
      console.log('\n📋 Recent Goals:');
      response.data.data.recentGoals.forEach((goal, index) => {
        console.log(`  ${index + 1}. ${goal.title}`);
        console.log(`     ${goal.summary}`);
      });
    }
    
  } catch (error) {
    console.log('❌ Main journey endpoint failed:', error.response?.data?.message || error.message);
  }
}

// Run the detailed test
if (require.main === module) {
  testJourneyDetailed().catch(console.error);
}

module.exports = { testJourneyDetailed };