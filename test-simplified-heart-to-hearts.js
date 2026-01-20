const axios = require('axios');

// Test the simplified heart-to-hearts logic
async function testSimplifiedHeartToHearts() {
  try {
    console.log('🚀 Testing Simplified Heart-to-Hearts Logic...\n');

    const BASE_URL = 'http://localhost:3000/api/v1';
    const TEST_EMAIL = 'test@example.com';
    const TEST_PASSWORD = 'password123';

    // Step 1: Login
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

    // Step 2: Check current journey stats
    console.log('\n2. Checking current journey stats...');
    const initialJourneyResponse = await axios.get(`${BASE_URL}/chats/journey`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (initialJourneyResponse.data.success) {
      const initialStats = initialJourneyResponse.data.data;
      console.log(`📊 Initial Stats:`);
      console.log(`   Heart-to-Hearts: ${initialStats.heartToHearts}`);
      console.log(`   Growth Moments: ${initialStats.growthMoments}`);
      console.log(`   Total Favorites: ${initialStats.totalFavorites}`);
    }

    // Step 3: Create a chat and send a message
    console.log('\n3. Creating chat and sending message...');
    const chatResponse = await axios.post(`${BASE_URL}/chats`, {
      name: 'Simplified Test Chat',
      type: 'PERSONAL_AI'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const chatId = chatResponse.data.data.id;
    console.log(`✅ Chat created: ${chatId}`);

    // Send a message
    const messageResponse = await axios.post(`${BASE_URL}/chats/${chatId}/messages`, {
      content: "I'm feeling really happy and excited about my new job!"
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const messageId = messageResponse.data.data.userMessage.id;
    console.log(`✅ Message sent: ${messageId}`);

    // Wait for emotion detection
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 4: Manually favorite the message
    console.log('\n4. Favoriting the message...');
    const favoriteResponse = await axios.post(`${BASE_URL}/chats/${chatId}/messages/${messageId}/favorite`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (favoriteResponse.data.success) {
      console.log('✅ Message favorited successfully');
    }

    // Step 5: Check updated journey stats
    console.log('\n5. Checking updated journey stats...');
    const updatedJourneyResponse = await axios.get(`${BASE_URL}/chats/journey`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (updatedJourneyResponse.data.success) {
      const updatedStats = updatedJourneyResponse.data.data;
      console.log(`📊 Updated Stats:`);
      console.log(`   Heart-to-Hearts: ${updatedStats.heartToHearts} (should equal total favorites)`);
      console.log(`   Growth Moments: ${updatedStats.growthMoments}`);
      console.log(`   Total Favorites: ${updatedStats.totalFavorites}`);
      
      // Verify the logic
      if (updatedStats.heartToHearts === updatedStats.totalFavorites) {
        console.log('\n✅ SUCCESS: Heart-to-Hearts now equals Total Favorites!');
        console.log('   When user favorites a message → Heart-to-Hearts count increases');
      } else {
        console.log('\n❌ ISSUE: Heart-to-Hearts should equal Total Favorites');
      }
    }

    // Step 6: Test heart-to-hearts messages endpoint
    console.log('\n6. Testing heart-to-hearts messages endpoint...');
    const heartToHeartsResponse = await axios.get(`${BASE_URL}/chats/journey/messages?category=heart-to-hearts`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (heartToHeartsResponse.data.success) {
      const heartToHeartsMessages = heartToHeartsResponse.data.data.items;
      console.log(`✅ Heart-to-Hearts messages: ${heartToHeartsMessages.length}`);
      
      heartToHeartsMessages.forEach((msg, index) => {
        console.log(`   ${index + 1}. "${msg.title}" (${msg.emotion?.label || 'No emotion'})`);
      });
    }

    console.log('\n🎉 Simplified Heart-to-Hearts test completed!');
    console.log('\n📝 New Logic Summary:');
    console.log('   • Heart-to-Hearts = Total number of favorited messages');
    console.log('   • Growth Moments = Favorited messages with joy/surprise emotions');
    console.log('   • When user favorites ANY message → Heart-to-Hearts increases by 1');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testSimplifiedHeartToHearts();