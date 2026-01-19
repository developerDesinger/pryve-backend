const https = require('https');

// Test configuration
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNta2pzM3FycTAwM2xwZXYwZDNxZ3VpdHoiLCJyb2xlIjoiQ0xJRU5UIiwiaWF0IjoxNzY4NzQzMzE4LCJleHAiOjE3NjkzNDgxMTh9.uF0vS7xdS7G4F3qNBgTgbYZ5apkfhPYfgtlhuLKk1KU";
const BASE_URL = "https://pryve-backend.projectco.space/api/v1";
const CHAT_ID = "cmkjslxxl003qpev0iabetui8";

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve(result);
        } catch (e) {
          resolve({ body, status: res.statusCode });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Create a message
async function createMessage(content) {
  const options = {
    hostname: 'pryve-backend.projectco.space',
    port: 443,
    path: `/api/v1/chats/${CHAT_ID}/messages`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    }
  };

  const data = {
    content: content,
    type: 'text'
  };

  try {
    const result = await makeRequest(options, data);
    console.log(`✅ Created message: "${content.substring(0, 50)}..."`);
    return result.data?.id;
  } catch (error) {
    console.error(`❌ Failed to create message:`, error.message);
    return null;
  }
}

// Favorite a message
async function favoriteMessage(messageId) {
  const options = {
    hostname: 'pryve-backend.projectco.space',
    port: 443,
    path: `/api/v1/chats/${CHAT_ID}/messages/${messageId}/favorite`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    }
  };

  try {
    await makeRequest(options);
    console.log(`⭐ Favorited message: ${messageId}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to favorite message:`, error.message);
    return false;
  }
}

// Get journey statistics
async function getJourneyStats() {
  const options = {
    hostname: 'pryve-backend.projectco.space',
    port: 443,
    path: '/api/v1/journey',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${TOKEN}`
    }
  };

  try {
    const result = await makeRequest(options);
    return result.data?.statistics;
  } catch (error) {
    console.error(`❌ Failed to get journey stats:`, error.message);
    return null;
  }
}

// Main test function
async function testSimplifiedJourney() {
  console.log('🚀 Testing Simplified Journey Statistics...\n');

  // Get initial stats
  console.log('📊 Initial Statistics:');
  const initialStats = await getJourneyStats();
  if (initialStats) {
    console.log(`Total Messages: ${initialStats.totalMessages}`);
    console.log(`Total Favorites: ${initialStats.totalFavorites}`);
    console.log(`Heart to Hearts: ${initialStats.heartToHearts}`);
    console.log(`Growth Moments: ${initialStats.growthMoments}`);
    console.log(`Goals Achieved: ${initialStats.goalsAchieved}`);
    console.log(`Breakthrough Days: ${initialStats.breakthroughDays}\n`);
  }

  // Test 1: Create and favorite a goal message
  console.log('🎯 Test 1: Creating goal achievement message...');
  const goalMessage = "I achieved my goal of completing this project! Feeling so accomplished and successful with this milestone.";
  const goalMessageId = await createMessage(goalMessage);
  if (goalMessageId) {
    await favoriteMessage(goalMessageId);
  }

  // Test 2: Create and favorite a positive message
  console.log('\n🌱 Test 2: Creating growth moment message...');
  const growthMessage = "Feeling so grateful and joyful today! This happiness is overwhelming in the best way.";
  const growthMessageId = await createMessage(growthMessage);
  if (growthMessageId) {
    await favoriteMessage(growthMessageId);
  }

  // Test 3: Create one more favorite for breakthrough day (need 3 total)
  console.log('\n💡 Test 3: Creating breakthrough day message...');
  const breakthroughMessage = "What an amazing day of progress and positive energy! Everything is going perfectly.";
  const breakthroughMessageId = await createMessage(breakthroughMessage);
  if (breakthroughMessageId) {
    await favoriteMessage(breakthroughMessageId);
  }

  // Wait a moment for processing
  console.log('\n⏳ Waiting for processing...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Get final stats
  console.log('\n📊 Final Statistics:');
  const finalStats = await getJourneyStats();
  if (finalStats) {
    console.log(`Total Messages: ${finalStats.totalMessages} (${finalStats.totalMessages - (initialStats?.totalMessages || 0)} new)`);
    console.log(`Total Favorites: ${finalStats.totalFavorites} (${finalStats.totalFavorites - (initialStats?.totalFavorites || 0)} new)`);
    console.log(`Heart to Hearts: ${finalStats.heartToHearts} (${finalStats.heartToHearts - (initialStats?.heartToHearts || 0)} new)`);
    console.log(`Growth Moments: ${finalStats.growthMoments} (${finalStats.growthMoments - (initialStats?.growthMoments || 0)} new)`);
    console.log(`Goals Achieved: ${finalStats.goalsAchieved} (${finalStats.goalsAchieved - (initialStats?.goalsAchieved || 0)} new)`);
    console.log(`Breakthrough Days: ${finalStats.breakthroughDays} (${finalStats.breakthroughDays - (initialStats?.breakthroughDays || 0)} new)`);
  }

  console.log('\n✅ Test completed! The simplified journey statistics should now be easier to achieve.');
  console.log('\n💡 Summary of changes:');
  console.log('- Heart to Hearts: Now only need 1 favorited message per chat (was 3)');
  console.log('- Growth Moments: Any positive emotion works (was only joy/surprise)');
  console.log('- Goals Achieved: Simple keyword detection (was complex patterns)');
  console.log('- Breakthrough Days: Only need 3 favorites per day (was 5 messages + 2 positive)');
}

// Run the test
testSimplifiedJourney().catch(console.error);