const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000/api/v1';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'password123';

async function testAutoFavoriting() {
  try {
    console.log('🚀 Testing Auto-Favoriting Fix...\n');

    // Step 1: Login to get token
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    if (!loginResponse.data.success) {
      throw new Error('Login failed');
    }

    const token = loginResponse.data.data.token;
    const userId = loginResponse.data.data.user.id;
    console.log(`✅ Logged in successfully. User ID: ${userId}`);

    // Step 2: Create a new chat
    console.log('\n2. Creating a new chat...');
    const chatResponse = await axios.post(`${BASE_URL}/chats`, {
      name: 'Auto-Favorite Test Chat',
      type: 'PERSONAL_AI'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!chatResponse.data.success) {
      throw new Error('Chat creation failed');
    }

    const chatId = chatResponse.data.data.id;
    console.log(`✅ Chat created successfully. Chat ID: ${chatId}`);

    // Step 3: Send emotional messages that should be auto-favorited
    const emotionalMessages = [
      "I'm feeling really anxious about my upcoming presentation tomorrow.",
      "I'm so excited and happy about getting the promotion!",
      "I feel overwhelmed and stressed with all the work I have to do.",
      "I'm grateful for all the support from my friends and family.",
      "I'm worried about my health test results coming back."
    ];

    console.log('\n3. Sending emotional messages...');
    const messageIds = [];

    for (let i = 0; i < emotionalMessages.length; i++) {
      const message = emotionalMessages[i];
      console.log(`\n   Sending message ${i + 1}: "${message.substring(0, 50)}..."`);
      
      const messageResponse = await axios.post(`${BASE_URL}/chats/${chatId}/messages`, {
        content: message
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (messageResponse.data.success) {
        const userMessageId = messageResponse.data.data.userMessage.id;
        messageIds.push(userMessageId);
        console.log(`   ✅ Message sent. ID: ${userMessageId}`);
      } else {
        console.log(`   ❌ Failed to send message: ${messageResponse.data.message}`);
      }

      // Wait a bit for emotion detection to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Step 4: Wait for emotion detection and auto-favoriting to complete
    console.log('\n4. Waiting for emotion detection and auto-favoriting...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Step 5: Check favorites
    console.log('\n5. Checking favorites...');
    const favoritesResponse = await axios.get(`${BASE_URL}/chats/favorites/messages`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (favoritesResponse.data.success) {
      const favorites = favoritesResponse.data.data;
      console.log(`✅ Found ${favorites.length} favorite messages`);
      
      favorites.forEach((fav, index) => {
        console.log(`   ${index + 1}. "${fav.message.content.substring(0, 50)}..." (Emotion: ${fav.message.emotion || 'None'}, Confidence: ${fav.message.emotionConfidence || 'N/A'})`);
      });
    } else {
      console.log('❌ Failed to fetch favorites');
    }

    // Step 6: Check journey states
    console.log('\n6. Checking journey states...');
    const journeyResponse = await axios.get(`${BASE_URL}/chats/journey`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (journeyResponse.data.success) {
      const journey = journeyResponse.data.data;
      console.log('✅ Journey states:');
      console.log(`   Heart-to-Hearts: ${journey.heartToHearts}`);
      console.log(`   Growth Moments: ${journey.growthMoments}`);
      console.log(`   Breakthrough Days: ${journey.breakthroughDays}`);
      console.log(`   Goals Achieved: ${journey.goalsAchieved}`);
      console.log(`   Total Favorites: ${journey.totalFavorites}`);
    } else {
      console.log('❌ Failed to fetch journey data');
    }

    console.log('\n🎉 Auto-favoriting test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testAutoFavoriting();