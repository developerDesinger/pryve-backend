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
        'User-Agent': 'Create-Message-Test/1.0'
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

async function createMessageAndTest() {
  console.log('💝 Creating Heart-to-Hearts Message and Testing');
  console.log('=' .repeat(70));
  
  try {
    // Step 1: Create a new chat
    console.log('\n1️⃣ Creating a new chat...');
    console.log('-'.repeat(50));
    
    const chatData = {
      title: 'Heart-to-Heart Conversation',
      description: 'A meaningful conversation about love and connection'
    };
    
    const chatResult = await makeRequest(`${BASE_URL}/chats`, 'POST', chatData);
    console.log(`📊 Chat creation status: ${chatResult.status}`);
    
    let chatId;
    if (chatResult.status === 200 || chatResult.status === 201) {
      chatId = chatResult.data?.data?.id || chatResult.data?.id;
      console.log(`✅ Chat created successfully! ID: ${chatId}`);
    } else {
      console.log(`❌ Chat creation failed: ${chatResult.raw}`);
      
      // Try to get existing chats
      console.log('\n🔍 Trying to get existing chats...');
      const chatsResult = await makeRequest(`${BASE_URL}/chats`);
      
      if (chatsResult.status === 200 && chatsResult.data?.data?.length > 0) {
        chatId = chatsResult.data.data[0].id;
        console.log(`✅ Using existing chat ID: ${chatId}`);
      } else {
        console.log('❌ No existing chats found, creating a simple message...');
        chatId = null;
      }
    }
    
    // Step 2: Send an emotional message
    console.log('\n2️⃣ Sending emotional message...');
    console.log('-'.repeat(50));
    
    const emotionalMessages = [
      {
        content: "I had the most beautiful heart-to-heart conversation with my partner today. We talked about our dreams, fears, and how much we mean to each other. I felt so connected and loved.",
        emotion: "love"
      },
      {
        content: "Today I opened up to my best friend about my struggles and they listened with such compassion. I felt truly understood and supported. These moments of vulnerability create the deepest connections.",
        emotion: "connection"
      },
      {
        content: "Had a meaningful conversation with my family about what really matters in life. We shared our hopes and gratitude for each other. My heart feels so full of love right now.",
        emotion: "gratitude"
      }
    ];
    
    const selectedMessage = emotionalMessages[Math.floor(Math.random() * emotionalMessages.length)];
    
    const messageData = {
      content: selectedMessage.content,
      chatId: chatId,
      emotion: selectedMessage.emotion,
      emotionConfidence: 0.95
    };
    
    console.log(`💬 Message: ${selectedMessage.content.substring(0, 100)}...`);
    console.log(`😊 Emotion: ${selectedMessage.emotion}`);
    
    const messageResult = await makeRequest(`${BASE_URL}/chats/messages`, 'POST', messageData);
    console.log(`📊 Message creation status: ${messageResult.status}`);
    console.log(`📄 Response: ${messageResult.raw}`);
    
    let messageId;
    if (messageResult.status === 200 || messageResult.status === 201) {
      messageId = messageResult.data?.data?.id || messageResult.data?.id;
      console.log(`✅ Message created successfully! ID: ${messageId}`);
    } else {
      console.log(`❌ Message creation failed`);
      
      // Try alternative message endpoint
      console.log('\n🔄 Trying alternative message endpoint...');
      const altMessageResult = await makeRequest(`${BASE_URL}/messages`, 'POST', {
        content: selectedMessage.content,
        emotion: selectedMessage.emotion
      });
      
      console.log(`📊 Alt message status: ${altMessageResult.status}`);
      console.log(`📄 Alt response: ${altMessageResult.raw}`);
      
      if (altMessageResult.status === 200 || altMessageResult.status === 201) {
        messageId = altMessageResult.data?.data?.id || altMessageResult.data?.id;
        console.log(`✅ Message created via alternative endpoint! ID: ${messageId}`);
      }
    }
    
    // Step 3: Favorite the message (if we have messageId)
    if (messageId) {
      console.log('\n3️⃣ Favoriting the message...');
      console.log('-'.repeat(50));
      
      const favoriteResult = await makeRequest(`${BASE_URL}/messages/${messageId}/favorite`, 'POST');
      console.log(`📊 Favorite status: ${favoriteResult.status}`);
      console.log(`📄 Favorite response: ${favoriteResult.raw}`);
      
      if (favoriteResult.status === 200 || favoriteResult.status === 201) {
        console.log(`✅ Message favorited successfully!`);
      } else {
        console.log(`⚠️ Favorite failed, but continuing with test...`);
      }
    }
    
    // Step 4: Wait a moment for processing
    console.log('\n⏳ Waiting 3 seconds for processing...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
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
          console.log(`\n${index + 1}. ${item.title || 'No title'}`);
          console.log(`   Content: ${item.content?.substring(0, 100)}...`);
          console.log(`   Emotion: ${item.emotion?.label} (${item.emotion?.confidence})`);
          console.log(`   Created: ${item.createdAt}`);
          console.log(`   Favorite: ${item.isFavorite}`);
        });
        
        console.log('\n🎉 SUCCESS! Heart-to-hearts endpoint now returns data!');
      } else {
        console.log('\n⚠️ Still no heart-to-hearts messages found');
        console.log('💡 This might mean:');
        console.log('   - Message needs more processing time');
        console.log('   - Emotion analysis not completed yet');
        console.log('   - Message not properly favorited');
        console.log('   - Different criteria required for heart-to-hearts');
      }
    }
    
    // Step 6: Test other categories to see if message appears anywhere
    console.log('\n5️⃣ Testing other categories...');
    console.log('-'.repeat(50));
    
    const categories = ['goals-achieved', 'growth-moments', 'breakthrough-days'];
    
    for (const category of categories) {
      const catUrl = `${BASE_URL}/chats/journey/messages?category=${category}&limit=5`;
      const catResult = await makeRequest(catUrl);
      
      if (catResult.status === 200 && catResult.data?.data?.items) {
        const count = catResult.data.data.items.length;
        console.log(`📂 ${category}: ${count} messages`);
      }
    }
    
    // Step 7: Check user's overall journey stats
    console.log('\n6️⃣ Checking journey statistics...');
    console.log('-'.repeat(50));
    
    const journeyResult = await makeRequest(`${BASE_URL}/journey`);
    
    if (journeyResult.status === 200 && journeyResult.data?.data?.statistics) {
      const stats = journeyResult.data.data.statistics;
      console.log('📊 Journey Statistics:');
      console.log(`   Total Messages: ${stats.totalMessages}`);
      console.log(`   Total Favorites: ${stats.totalFavorites}`);
      console.log(`   Heart to Hearts: ${stats.heartToHearts}`);
      console.log(`   Growth Moments: ${stats.growthMoments}`);
      console.log(`   Goals Achieved: ${stats.goalsAchieved}`);
      console.log(`   Breakthrough Days: ${stats.breakthroughDays}`);
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  }
  
  console.log('\n🏁 TEST COMPLETED');
  console.log('=' .repeat(70));
}

if (require.main === module) {
  createMessageAndTest().catch(console.error);
}

module.exports = { createMessageAndTest };