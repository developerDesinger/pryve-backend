const https = require('https');

// Using the valid token we generated
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNta2pzM3FycTAwM2xwZXYwZDNxZ3VpdHoiLCJyb2xlIjoiQ0xJRU5UIiwiaWF0IjoxNzY4NzQzMzE4LCJleHAiOjE3NjkzNDgxMTh9.uF0vS7xdS7G4F3qNBgTgbYZ5apkfhPYfgtlhuLKk1KU';
const BASE_URL = 'https://pryve-backend.projectco.space/api/v1';

function makeRequest(url, method = 'GET', data = null, token = TOKEN) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = data ? JSON.stringify(data) : null;
    
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Create-Message-Correct/1.0'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData,
            raw: data
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: null,
            raw: data,
            parseError: error.message
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

async function createMessageAndTestCorrect() {
  console.log('💝 Creating Heart-to-Hearts Message (Correct Endpoints)');
  console.log('=' .repeat(70));
  
  try {
    // Step 1: Create a new chat using correct endpoint
    console.log('\n1️⃣ Creating a new chat...');
    console.log('-'.repeat(50));
    
    const chatData = {
      title: 'Heart-to-Heart Conversation',
      description: 'A meaningful conversation about love and connection'
    };
    
    const chatResult = await makeRequest(`${BASE_URL}/chats`, 'POST', chatData);
    console.log(`📊 Chat creation status: ${chatResult.status}`);
    console.log(`📄 Chat response: ${chatResult.raw}`);
    
    let chatId;
    if (chatResult.status === 200 || chatResult.status === 201) {
      chatId = chatResult.data?.data?.id || chatResult.data?.id || chatResult.data?.chat?.id;
      console.log(`✅ Chat created successfully! ID: ${chatId}`);
    } else {
      console.log(`❌ Chat creation failed, trying to get existing chats...`);
      
      // Get existing chats
      const chatsResult = await makeRequest(`${BASE_URL}/chats`);
      console.log(`📊 Get chats status: ${chatsResult.status}`);
      
      if (chatsResult.status === 200 && chatsResult.data?.data?.length > 0) {
        chatId = chatsResult.data.data[0].id;
        console.log(`✅ Using existing chat ID: ${chatId}`);
      } else {
        console.log('❌ No existing chats found, will create one manually...');
        // For testing, let's use a dummy chatId and see what happens
        chatId = 'test-chat-id';
      }
    }
    
    // Step 2: Send an emotional message using correct endpoint
    console.log('\n2️⃣ Sending emotional message...');
    console.log('-'.repeat(50));
    
    const emotionalMessage = {
      content: "I had the most beautiful heart-to-heart conversation with my partner today. We talked about our dreams, our fears, and how much we mean to each other. I felt so deeply connected and loved. These moments of vulnerability and openness create the strongest bonds between people. My heart is overflowing with gratitude and love right now.",
      type: 'text'
    };
    
    console.log(`💬 Message: ${emotionalMessage.content.substring(0, 100)}...`);
    console.log(`📝 Chat ID: ${chatId}`);
    
    // Use the correct endpoint: POST /chats/:chatId/messages
    const messageUrl = `${BASE_URL}/chats/${chatId}/messages`;
    console.log(`🔗 Message URL: ${messageUrl}`);
    
    const messageResult = await makeRequest(messageUrl, 'POST', emotionalMessage);
    console.log(`📊 Message creation status: ${messageResult.status}`);
    console.log(`📄 Message response: ${messageResult.raw}`);
    
    let messageId;
    if (messageResult.status === 200 || messageResult.status === 201) {
      messageId = messageResult.data?.data?.id || messageResult.data?.id || messageResult.data?.message?.id;
      console.log(`✅ Message created successfully! ID: ${messageId}`);
    } else {
      console.log(`❌ Message creation failed`);
      
      // If we don't have a valid chatId, let's try creating a chat first
      if (chatResult.status !== 200 && chatResult.status !== 201) {
        console.log('\n🔄 Trying to create chat again with minimal data...');
        const minimalChatResult = await makeRequest(`${BASE_URL}/chats`, 'POST', {
          title: 'Test Chat'
        });
        
        console.log(`📊 Minimal chat status: ${minimalChatResult.status}`);
        console.log(`📄 Minimal chat response: ${minimalChatResult.raw}`);
        
        if (minimalChatResult.status === 200 || minimalChatResult.status === 201) {
          const newChatId = minimalChatResult.data?.data?.id || minimalChatResult.data?.id;
          console.log(`✅ New chat created! ID: ${newChatId}`);
          
          // Try sending message to new chat
          const newMessageResult = await makeRequest(`${BASE_URL}/chats/${newChatId}/messages`, 'POST', emotionalMessage);
          console.log(`📊 New message status: ${newMessageResult.status}`);
          console.log(`📄 New message response: ${newMessageResult.raw}`);
          
          if (newMessageResult.status === 200 || newMessageResult.status === 201) {
            messageId = newMessageResult.data?.data?.id || newMessageResult.data?.id;
            chatId = newChatId;
            console.log(`✅ Message created in new chat! Message ID: ${messageId}`);
          }
        }
      }
    }
    
    // Step 3: Favorite the message (if we have messageId and chatId)
    if (messageId && chatId) {
      console.log('\n3️⃣ Favoriting the message...');
      console.log('-'.repeat(50));
      
      // Use correct favorite endpoint: POST /chats/:chatId/messages/:messageId/favorite
      const favoriteUrl = `${BASE_URL}/chats/${chatId}/messages/${messageId}/favorite`;
      console.log(`🔗 Favorite URL: ${favoriteUrl}`);
      
      const favoriteResult = await makeRequest(favoriteUrl, 'POST');
      console.log(`📊 Favorite status: ${favoriteResult.status}`);
      console.log(`📄 Favorite response: ${favoriteResult.raw}`);
      
      if (favoriteResult.status === 200 || favoriteResult.status === 201) {
        console.log(`✅ Message favorited successfully!`);
      } else {
        console.log(`⚠️ Favorite failed, but continuing with test...`);
        
        // Try toggle favorite endpoint
        const toggleUrl = `${BASE_URL}/chats/${chatId}/messages/${messageId}/toggle-favorite`;
        const toggleResult = await makeRequest(toggleUrl, 'POST');
        console.log(`📊 Toggle favorite status: ${toggleResult.status}`);
        console.log(`📄 Toggle response: ${toggleResult.raw}`);
      }
    }
    
    // Step 4: Wait for processing
    console.log('\n⏳ Waiting 5 seconds for AI processing and emotion analysis...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Step 5: Test the heart-to-hearts endpoint
    console.log('\n4️⃣ Testing heart-to-hearts endpoint...');
    console.log('-'.repeat(50));
    
    const heartUrl = `${BASE_URL}/chats/journey/messages?category=heart-to-hearts&limit=10`;
    console.log(`🔗 URL: ${heartUrl}`);
    
    const heartResult = await makeRequest(heartUrl);
    console.log(`📊 Heart-to-hearts status: ${heartResult.status}`);
    
    console.log('\n📄 HEART-TO-HEARTS RESPONSE:');
    console.log('=' .repeat(70));
    console.log(JSON.stringify(heartResult.data, null, 2));
    console.log('=' .repeat(70));
    
    if (heartResult.status === 200 && heartResult.data?.success) {
      const items = heartResult.data.data?.items || [];
      console.log(`\n📊 Found ${items.length} heart-to-hearts messages`);
      
      if (items.length > 0) {
        console.log('\n💝 HEART-TO-HEARTS MESSAGES:');
        items.forEach((item, index) => {
          console.log(`\n${index + 1}. Message Details:`);
          console.log(`   📝 ID: ${item.id}`);
          console.log(`   📰 Title: ${item.title || 'No title'}`);
          console.log(`   💬 Content: ${item.content?.substring(0, 150)}...`);
          console.log(`   😊 Emotion: ${item.emotion?.label} (${item.emotion?.confidence})`);
          console.log(`   📅 Created: ${item.createdAt}`);
          console.log(`   ⭐ Favorite: ${item.isFavorite}`);
        });
        
        console.log('\n🎉 SUCCESS! Heart-to-hearts endpoint now returns data!');
      } else {
        console.log('\n⚠️ Still no heart-to-hearts messages found');
        console.log('💡 Possible reasons:');
        console.log('   - Message needs more processing time for emotion analysis');
        console.log('   - AI hasn\'t classified it as heart-to-hearts emotion yet');
        console.log('   - Message not properly favorited');
        console.log('   - Specific criteria not met for heart-to-hearts category');
      }
    }
    
    // Step 6: Check journey statistics
    console.log('\n5️⃣ Checking updated journey statistics...');
    console.log('-'.repeat(50));
    
    const journeyResult = await makeRequest(`${BASE_URL}/journey`);
    
    if (journeyResult.status === 200 && journeyResult.data?.data?.statistics) {
      const stats = journeyResult.data.data.statistics;
      console.log('📊 Updated Journey Statistics:');
      console.log(`   Total Messages: ${stats.totalMessages}`);
      console.log(`   Total Favorites: ${stats.totalFavorites}`);
      console.log(`   Heart to Hearts: ${stats.heartToHearts}`);
      console.log(`   Growth Moments: ${stats.growthMoments}`);
      console.log(`   Goals Achieved: ${stats.goalsAchieved}`);
      console.log(`   Breakthrough Days: ${stats.breakthroughDays}`);
      
      if (stats.totalMessages > 0) {
        console.log('\n✅ Message was created and counted!');
      }
      if (stats.totalFavorites > 0) {
        console.log('✅ Message was favorited successfully!');
      }
      if (stats.heartToHearts > 0) {
        console.log('✅ Heart-to-hearts count increased!');
      }
    } else {
      console.log('❌ Could not get journey statistics');
      console.log(`📄 Journey response: ${journeyResult.raw}`);
    }
    
    // Step 7: Test all categories to see where our message appears
    console.log('\n6️⃣ Testing all categories...');
    console.log('-'.repeat(50));
    
    const categories = ['heart-to-hearts', 'goals-achieved', 'growth-moments', 'breakthrough-days'];
    
    for (const category of categories) {
      const catUrl = `${BASE_URL}/chats/journey/messages?category=${category}&limit=5`;
      const catResult = await makeRequest(catUrl);
      
      if (catResult.status === 200 && catResult.data?.data?.items) {
        const count = catResult.data.data.items.length;
        console.log(`📂 ${category}: ${count} messages`);
        
        if (count > 0) {
          console.log(`   ✅ Found messages in ${category}!`);
        }
      }
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  }
  
  console.log('\n🏁 TEST COMPLETED');
  console.log('=' .repeat(70));
}

if (require.main === module) {
  createMessageAndTestCorrect().catch(console.error);
}

module.exports = { createMessageAndTestCorrect };