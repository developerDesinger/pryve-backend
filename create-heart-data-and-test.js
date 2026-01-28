const https = require('https');

// Your JWT token
const YOUR_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtanBqN2IxdzAwMGhwZWp0b2R6cDN2YjUiLCJyb2xlIjoiQ0xJRU5UIiwiaWF0IjoxNzY5NTMwNDA2LCJleHAiOjE3NzAxMzUyMDZ9.YL9ecIiGK6kTLdEJEIcZOef_I8XB02laaKP37tqd7Mk';

// Live server configuration
const BASE_URL = 'https://pryve-backend.projectco.space';

function makeRequest(url, token, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Create-Heart-Data/1.0'
      }
    };

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
            data: jsonData,
            raw: data
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
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
      reject(new Error('Request timeout (15s)'));
    });
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function createHeartDataAndTest() {
  console.log('💝 Creating Heart-to-Hearts Data & Testing');
  console.log('=' .repeat(60));
  console.log(`🌐 Server: ${BASE_URL}`);
  console.log(`🔑 Token: ${YOUR_TOKEN.substring(0, 20)}...`);
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Get existing chats
    console.log('\n1️⃣ Getting User Chats');
    console.log('-'.repeat(40));
    
    const chatsResult = await makeRequest(`${BASE_URL}/api/v1/chats`, YOUR_TOKEN);
    console.log(`📊 Status: ${chatsResult.status}`);
    
    let chatId = null;
    
    if (chatsResult.status === 200) {
      const chats = chatsResult.data.data || [];
      console.log(`✅ Found ${chats.length} chats`);
      
      if (chats.length > 0) {
        chatId = chats[0].id;
        console.log(`📝 Using existing chat: ${chatId}`);
      }
    }
    
    // Step 2: Create a new chat if needed
    if (!chatId) {
      console.log('\n2️⃣ Creating New Chat');
      console.log('-'.repeat(40));
      
      const createChatResult = await makeRequest(
        `${BASE_URL}/api/v1/chats`, 
        YOUR_TOKEN, 
        'POST', 
        {
          name: 'Heart-to-Hearts Test Chat',
          description: 'Testing emotional messages for heart-to-hearts'
        }
      );
      
      console.log(`📊 Status: ${createChatResult.status}`);
      
      if (createChatResult.status === 200 || createChatResult.status === 201) {
        chatId = createChatResult.data.data?.id || createChatResult.data.id;
        console.log(`✅ Created chat: ${chatId}`);
      } else {
        console.log(`❌ Failed to create chat: ${createChatResult.raw}`);
        return;
      }
    }
    
    // Step 3: Send emotional user messages
    console.log('\n3️⃣ Sending Emotional User Messages');
    console.log('-'.repeat(40));
    
    const emotionalMessages = [
      {
        content: "I feel so grateful today. This moment of reflection brings me peace and joy. I want to remember this feeling forever.",
        emotion: "joy"
      },
      {
        content: "Today I realized how much I've grown. Looking back at my journey, I'm proud of how far I've come. This is a breakthrough moment for me.",
        emotion: "pride"
      },
      {
        content: "I'm feeling overwhelmed but also hopeful. Life has its challenges, but I know I can overcome them. This too shall pass.",
        emotion: "hope"
      },
      {
        content: "I accomplished something I never thought possible today. Setting that goal and achieving it feels incredible. I'm so happy!",
        emotion: "joy"
      },
      {
        content: "Sometimes I feel sad, but I'm learning that it's okay to feel this way. These emotions are part of my human experience.",
        emotion: "sadness"
      }
    ];
    
    const messageIds = [];
    
    for (let i = 0; i < emotionalMessages.length; i++) {
      const msg = emotionalMessages[i];
      console.log(`\n📤 Sending message ${i + 1}/5: ${msg.content.substring(0, 50)}...`);
      
      const messageResult = await makeRequest(
        `${BASE_URL}/api/v1/chats/${chatId}/messages`,
        YOUR_TOKEN,
        'POST',
        {
          content: msg.content,
          role: 'user'
        }
      );
      
      console.log(`   Status: ${messageResult.status}`);
      
      if (messageResult.status === 200 || messageResult.status === 201) {
        const msgId = messageResult.data.data?.id || messageResult.data.id;
        if (msgId) {
          messageIds.push(msgId);
          console.log(`   ✅ Message created: ${msgId}`);
        }
      } else {
        console.log(`   ❌ Failed: ${messageResult.raw}`);
      }
      
      // Wait a bit between messages
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`\n📊 Created ${messageIds.length} messages`);
    
    // Step 4: Favorite the messages
    console.log('\n4️⃣ Favoriting Messages');
    console.log('-'.repeat(40));
    
    let favoritedCount = 0;
    
    for (let i = 0; i < messageIds.length; i++) {
      const msgId = messageIds[i];
      console.log(`\n⭐ Favoriting message ${i + 1}/${messageIds.length}: ${msgId}`);
      
      const favoriteResult = await makeRequest(
        `${BASE_URL}/api/v1/messages/${msgId}/favorite`,
        YOUR_TOKEN,
        'POST'
      );
      
      console.log(`   Status: ${favoriteResult.status}`);
      
      if (favoriteResult.status === 200 || favoriteResult.status === 201) {
        favoritedCount++;
        console.log(`   ✅ Favorited successfully`);
      } else {
        console.log(`   ❌ Failed: ${favoriteResult.raw}`);
      }
      
      // Wait a bit between favorites
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`\n📊 Favorited ${favoritedCount} messages`);
    
    // Step 5: Wait for processing
    console.log('\n5️⃣ Waiting for Emotional Analysis');
    console.log('-'.repeat(40));
    console.log('⏳ Waiting 3 seconds for emotional analysis to process...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 6: Test heart-to-hearts endpoint
    console.log('\n6️⃣ Testing Heart-to-Hearts Endpoint');
    console.log('-'.repeat(40));
    
    const heartEndpoint = `${BASE_URL}/api/v1/chats/journey/messages?category=heart-to-hearts&limit=10`;
    console.log(`🎯 Endpoint: ${heartEndpoint}`);
    
    const heartResult = await makeRequest(heartEndpoint, YOUR_TOKEN);
    console.log(`📊 Status: ${heartResult.status}`);
    
    if (heartResult.status === 200) {
      console.log('✅ SUCCESS!');
      console.log('\n📋 Heart-to-Hearts Response:');
      console.log(JSON.stringify(heartResult.data, null, 2));
      
      const items = heartResult.data.data?.items || [];
      console.log(`\n💝 Heart-to-Hearts Count: ${items.length}`);
      
      if (items.length > 0) {
        console.log('\n🎉 Found Heart-to-Hearts Messages:');
        items.forEach((item, index) => {
          console.log(`\n${index + 1}. ${item.title || 'No title'}`);
          console.log(`   Primary Tag: ${item.primaryTag}`);
          console.log(`   Source: ${item.source}`);
          console.log(`   Timestamp: ${item.timestamp}`);
          if (item.emotion) {
            console.log(`   Emotion: ${item.emotion.label} (${item.emotion.confidence})`);
          }
          console.log(`   Chat: ${item.chat?.name || 'No chat name'}`);
        });
      } else {
        console.log('\n⚠️  Still no heart-to-hearts found');
        console.log('💡 This might mean:');
        console.log('   - Emotional analysis is still processing');
        console.log('   - Messages need more time to be analyzed');
        console.log('   - There might be an issue with the favoriting process');
      }
    } else {
      console.log(`❌ Heart-to-hearts test failed: ${heartResult.status}`);
      console.log(`Response: ${heartResult.raw}`);
    }
    
    // Step 7: Test other categories for comparison
    console.log('\n7️⃣ Testing Other Categories');
    console.log('-'.repeat(40));
    
    const categories = ['goals-achieved', 'growth-moments', 'breakthrough-days'];
    
    for (const category of categories) {
      const categoryEndpoint = `${BASE_URL}/api/v1/chats/journey/messages?category=${category}&limit=5`;
      console.log(`\n📂 Testing: ${category}`);
      
      try {
        const categoryResult = await makeRequest(categoryEndpoint, YOUR_TOKEN);
        const items = categoryResult.data?.data?.items || [];
        console.log(`   Status: ${categoryResult.status} | Items: ${items.length}`);
        
        if (items.length > 0) {
          console.log(`   ✅ Found ${items.length} ${category} messages`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
    
    // Step 8: Check favorites endpoint
    console.log('\n8️⃣ Checking Favorites Endpoint');
    console.log('-'.repeat(40));
    
    const favoritesEndpoint = `${BASE_URL}/api/v1/favorites`;
    const favoritesResult = await makeRequest(favoritesEndpoint, YOUR_TOKEN);
    console.log(`📊 Favorites Status: ${favoritesResult.status}`);
    
    if (favoritesResult.status === 200) {
      const favorites = favoritesResult.data.data || [];
      console.log(`✅ Found ${favorites.length} favorites in database`);
    } else {
      console.log(`⚠️  Favorites endpoint: ${favoritesResult.raw}`);
    }
    
  } catch (error) {
    console.error('❌ Process failed:', error.message);
  }
  
  console.log('\n✨ Heart-to-Hearts data creation and testing completed!');
  console.log('\n💡 Summary:');
  console.log('   1. Created emotional user messages');
  console.log('   2. Favorited those messages');
  console.log('   3. Tested heart-to-hearts endpoint');
  console.log('   4. Heart-to-hearts should now contain your favorited messages');
}

// Run the process
createHeartDataAndTest().catch(console.error);