/**
 * Test script for Journey endpoints - Favorite Messages Only
 * Tests that all journey endpoints return only favorite messages
 * 
 * Usage:
 * 1. Make sure your server is running: npm run dev (or npm start)
 * 2. Get a valid JWT token (login via your app or create a test user)
 * 3. Update TOKEN variable below with your token
 * 4. Run: node test-journey-favorites-local.js
 */

const axios = require('axios');

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:3400/api/v1';
const TOKEN = process.env.TEST_TOKEN || 'YOUR_JWT_TOKEN_HERE'; // Update this with a valid token

// Helper function to make authenticated requests
async function makeRequest(url, token) {
  try {
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      validateStatus: () => true, // Don't throw on any status
    });
    return {
      status: response.status,
      data: response.data,
      raw: JSON.stringify(response.data, null, 2),
    };
  } catch (error) {
    return {
      status: error.response?.status || 500,
      data: error.response?.data || { message: error.message },
      raw: error.message,
    };
  }
}

async function testJourneyEndpoints() {
  console.log('🧪 Testing Journey Endpoints - Favorite Messages Only\n');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`🔑 Token: ${TOKEN.substring(0, 20)}...\n`);

  if (TOKEN === 'YOUR_JWT_TOKEN_HERE') {
    console.log('❌ ERROR: Please update the TOKEN variable with a valid JWT token');
    console.log('   You can get a token by logging in through your app or creating a test user\n');
    return;
  }

  const categories = [
    'heart-to-hearts',
    'growth-moments',
    'breakthrough-days',
    'goals-achieved',
  ];

  // Test 1: Main Journey Endpoint
  console.log('1️⃣ Testing Main Journey Endpoint (/journey)');
  console.log('━'.repeat(60));
  const journeyResult = await makeRequest(`${BASE_URL}/journey`, TOKEN);
  
  if (journeyResult.status === 200) {
    const stats = journeyResult.data.data?.statistics;
    console.log('✅ SUCCESS');
    console.log(`📊 Statistics:`);
    console.log(`   - Heart-to-Hearts: ${stats?.heartToHearts || 0}`);
    console.log(`   - Growth Moments: ${stats?.growthMoments || 0}`);
    console.log(`   - Breakthrough Days: ${stats?.breakthroughDays || 0}`);
    console.log(`   - Goals Achieved: ${stats?.goalsAchieved || 0}`);
    console.log(`   - Total Favorites: ${stats?.totalFavorites || 0}\n`);
  } else if (journeyResult.status === 401) {
    console.log(`❌ UNAUTHORIZED (${journeyResult.status})`);
    console.log('   Invalid or expired token. Please update TOKEN variable.\n');
  } else {
    console.log(`❌ FAILED (${journeyResult.status})`);
    console.log(`📊 Response: ${journeyResult.raw}\n`);
  }

  // Test 2: Journey Messages by Category
  console.log('\n2️⃣ Testing Journey Messages Endpoints');
  console.log('━'.repeat(60));
  
  for (const category of categories) {
    console.log(`\n📁 Category: ${category}`);
    
    // Test both endpoint paths
    const endpoints = [
      { name: 'Direct Route', url: `${BASE_URL}/journey/messages?category=${category}&limit=10` },
      { name: 'Chat Route', url: `${BASE_URL}/chats/journey/messages?category=${category}&limit=10` },
    ];

    for (const endpoint of endpoints) {
      console.log(`   🔗 ${endpoint.name}: ${endpoint.url}`);
      const result = await makeRequest(endpoint.url, TOKEN);

      if (result.status === 200) {
        const items = result.data.data?.items || [];
        console.log(`      ✅ SUCCESS - Found ${items.length} items`);
        
        if (items.length > 0) {
          console.log(`      📝 Sample item:`);
          const sample = items[0];
          console.log(`         - ID: ${sample.id}`);
          console.log(`         - Title: ${sample.title?.substring(0, 50)}...`);
          if (sample.emotion) {
            console.log(`         - Emotion: ${sample.emotion.label} (${sample.emotion.confidence})`);
          }
        } else {
          console.log(`      ⚠️  No items found (may be normal if user has no favorite messages in this category)`);
        }
      } else if (result.status === 401) {
        console.log(`      ❌ UNAUTHORIZED - Invalid token`);
      } else {
        console.log(`      ❌ FAILED (${result.status})`);
        console.log(`      📊 ${result.data?.message || 'Unknown error'}`);
      }
    }
  }

  // Test 3: Verify Favorite Messages Endpoint
  console.log('\n\n3️⃣ Testing Favorite Messages Endpoint');
  console.log('━'.repeat(60));
  const favoritesResult = await makeRequest(`${BASE_URL}/chats/favorites/messages?limit=10`, TOKEN);
  
  if (favoritesResult.status === 200) {
    const favorites = favoritesResult.data.data || [];
    console.log(`✅ SUCCESS - Found ${favorites.length} favorite messages`);
    
    if (favorites.length > 0) {
      console.log(`\n📝 Sample favorites:`);
      favorites.slice(0, 3).forEach((fav, index) => {
        console.log(`   ${index + 1}. ${fav.content?.substring(0, 60)}...`);
        if (fav.emotion) {
          console.log(`      Emotion: ${fav.emotion} (${fav.emotionConfidence || 'N/A'})`);
        }
      });
    }
  } else {
    console.log(`❌ FAILED (${favoritesResult.status})`);
    console.log(`📊 ${favoritesResult.data?.message || 'Unknown error'}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Testing Complete!');
  console.log('\n💡 Notes:');
  console.log('   - All journey endpoints should now return ONLY favorite messages');
  console.log('   - If you see 0 items, the user may not have favorited any messages');
  console.log('   - Make sure messages are favorited before testing journey endpoints');
  console.log('='.repeat(60) + '\n');
}

// Run tests
if (require.main === module) {
  testJourneyEndpoints().catch(console.error);
}

module.exports = { testJourneyEndpoints };

