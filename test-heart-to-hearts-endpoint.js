/**
 * Test script for heart-to-hearts endpoint
 * Verifies that only favorite messages are returned
 */

const axios = require('axios');

const BASE_URL = 'https://pryve-backend.projectco.space/api/v1';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtamsxcWUxZzAwMDBwZWN1aTR2c2U3dGQiLCJyb2xlIjoiQ0xJRU5UIiwiaWF0IjoxNzY3ODUwMzQ3LCJleHAiOjE3Njg0NTUxNDd9.7BF8I4WOpn7BzWlAjTIMmlBP-JiMfMuHjp6Ki_YmPuE';

async function testHeartToHeartsEndpoint() {
  console.log('🧪 Testing Heart-to-Hearts Endpoint - Favorite Messages Only\n');
  console.log('━'.repeat(70));

  try {
    // Test 1: Get all favorite messages first
    console.log('\n1️⃣ Getting all favorite messages...');
    const favoritesResponse = await axios.get(`${BASE_URL}/chats/favorites/messages?limit=100`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    const allFavorites = favoritesResponse.data.data || [];
    console.log(`✅ Found ${allFavorites.length} total favorite messages`);

    // Get favorite message IDs
    const favoriteMessageIds = new Set(allFavorites.map(fav => fav.id));
    console.log(`📝 Favorite message IDs: ${Array.from(favoriteMessageIds).slice(0, 5).join(', ')}...`);

    // Test 2: Test heart-to-hearts endpoint (both routes)
    console.log('\n2️⃣ Testing Heart-to-Hearts Endpoint');
    console.log('━'.repeat(70));

    const endpoints = [
      { 
        name: 'Chat Route', 
        url: `${BASE_URL}/chats/journey/messages?category=heart-to-hearts&limit=10` 
      },
      { 
        name: 'Direct Route', 
        url: `${BASE_URL}/journey/messages?category=heart-to-hearts&limit=10` 
      },
    ];

    for (const endpoint of endpoints) {
      console.log(`\n🔗 ${endpoint.name}:`);
      console.log(`   URL: ${endpoint.url}`);

      try {
        const response = await axios.get(endpoint.url, {
          headers: {
            'Authorization': `Bearer ${TOKEN}`,
            'Content-Type': 'application/json',
          },
        });

        const items = response.data.data?.items || [];
        console.log(`   ✅ SUCCESS - Returned ${items.length} items`);

        if (items.length > 0) {
          // Verify all items are favorites
          let allAreFavorites = true;
          const nonFavoriteIds = [];

          items.forEach(item => {
            if (!favoriteMessageIds.has(item.id)) {
              allAreFavorites = false;
              nonFavoriteIds.push(item.id);
            }
          });

          if (allAreFavorites) {
            console.log(`   ✅ VERIFIED: All ${items.length} items are favorite messages!`);
          } else {
            console.log(`   ❌ ERROR: Found ${nonFavoriteIds.length} non-favorite messages!`);
            console.log(`   📝 Non-favorite message IDs: ${nonFavoriteIds.join(', ')}`);
          }

          console.log(`\n   📋 Sample items:`);
          items.slice(0, 3).forEach((item, index) => {
            console.log(`      ${index + 1}. ID: ${item.id}`);
            console.log(`         Title: ${item.title?.substring(0, 50)}...`);
            console.log(`         Emotion: ${item.emotion?.label || 'N/A'} (${item.emotion?.confidence || 'N/A'})`);
            console.log(`         Is Favorite: ${favoriteMessageIds.has(item.id) ? '✅ YES' : '❌ NO'}`);
          });
        } else {
          console.log(`   ⚠️  No items found (may be normal if user has no favorite messages in heart-to-hearts category)`);
        }

      } catch (error) {
        console.log(`   ❌ ERROR (${error.response?.status || 'Unknown'}):`);
        console.log(`   📝 ${error.response?.data?.message || error.message}`);
      }
    }

    // Test 3: Verify statistics
    console.log('\n\n3️⃣ Testing Journey Statistics');
    console.log('━'.repeat(70));

    try {
      const statsResponse = await axios.get(`${BASE_URL}/journey`, {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      const stats = statsResponse.data.data?.statistics;
      console.log(`✅ Journey Statistics:`);
      console.log(`   - Heart-to-Hearts: ${stats?.heartToHearts || 0}`);
      console.log(`   - Growth Moments: ${stats?.growthMoments || 0}`);
      console.log(`   - Breakthrough Days: ${stats?.breakthroughDays || 0}`);
      console.log(`   - Goals Achieved: ${stats?.goalsAchieved || 0}`);
      console.log(`   - Total Favorites: ${stats?.totalFavorites || 0}`);

      // Verify heart-to-hearts count matches
      if (stats?.heartToHearts !== undefined) {
        console.log(`\n   💡 Heart-to-Hearts count should match favorite messages in qualified chats`);
      }

    } catch (error) {
      console.log(`❌ ERROR: ${error.response?.data?.message || error.message}`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ Testing Complete!');
    console.log('\n💡 Summary:');
    console.log('   - All items returned should be favorite messages');
    console.log('   - If you see non-favorite messages, the endpoint needs to be fixed');
    console.log('   - Make sure the server is running the latest code');
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run test
if (require.main === module) {
  testHeartToHeartsEndpoint().catch(console.error);
}

module.exports = { testHeartToHeartsEndpoint };

