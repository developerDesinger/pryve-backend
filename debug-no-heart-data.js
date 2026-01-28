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
        'User-Agent': 'Debug-Heart-Data/1.0'
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

async function debugNoHeartData() {
  console.log('🔍 Debugging Why No Heart-to-Hearts Data');
  console.log('=' .repeat(60));
  console.log(`🌐 Server: ${BASE_URL}`);
  console.log(`🔑 Token: ${YOUR_TOKEN.substring(0, 20)}...`);
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Check if user has any chats at all
    console.log('\n1️⃣ Checking User Chats');
    console.log('-'.repeat(40));
    
    const chatsEndpoint = `${BASE_URL}/api/v1/chats`;
    console.log(`🎯 Endpoint: ${chatsEndpoint}`);
    
    const chatsResult = await makeRequest(chatsEndpoint, YOUR_TOKEN);
    console.log(`📊 Status: ${chatsResult.status}`);
    
    if (chatsResult.status === 200) {
      const chats = chatsResult.data.data || chatsResult.data.chats || [];
      console.log(`✅ Found ${chats.length} chats`);
      
      if (chats.length > 0) {
        console.log('\n📋 User Chats:');
        chats.forEach((chat, index) => {
          console.log(`${index + 1}. ${chat.name || chat.title || 'Unnamed Chat'}`);
          console.log(`   ID: ${chat.id}`);
          console.log(`   Created: ${chat.createdAt}`);
          console.log(`   Messages: ${chat.messageCount || 'Unknown'}`);
        });
        
        // Step 2: Check messages in first chat
        if (chats[0]?.id) {
          await checkChatMessages(chats[0].id);
        }
      } else {
        console.log('⚠️  No chats found - this explains why no heart-to-hearts!');
        console.log('💡 User needs to create chats first');
      }
    } else {
      console.log(`❌ Failed to get chats: ${chatsResult.status}`);
      console.log(`Response: ${chatsResult.raw}`);
    }
    
    // Step 3: Check favorites directly
    console.log('\n2️⃣ Checking User Favorites');
    console.log('-'.repeat(40));
    
    const favoritesEndpoint = `${BASE_URL}/api/v1/favorites`;
    console.log(`🎯 Endpoint: ${favoritesEndpoint}`);
    
    const favoritesResult = await makeRequest(favoritesEndpoint, YOUR_TOKEN);
    console.log(`📊 Status: ${favoritesResult.status}`);
    
    if (favoritesResult.status === 200) {
      const favorites = favoritesResult.data.data || favoritesResult.data.favorites || [];
      console.log(`✅ Found ${favorites.length} favorites`);
      
      if (favorites.length > 0) {
        console.log('\n⭐ User Favorites:');
        favorites.forEach((fav, index) => {
          console.log(`${index + 1}. ${fav.message?.content?.substring(0, 100) || 'No content'}...`);
          console.log(`   Message ID: ${fav.messageId}`);
          console.log(`   Created: ${fav.createdAt}`);
        });
      } else {
        console.log('⚠️  No favorites found - this explains why no heart-to-hearts!');
        console.log('💡 Heart-to-hearts come from favorited messages');
      }
    } else {
      console.log(`❌ Failed to get favorites: ${favoritesResult.status}`);
      console.log(`Response: ${favoritesResult.raw}`);
    }
    
    // Step 4: Check all messages with emotions
    console.log('\n3️⃣ Checking Messages with Emotions');
    console.log('-'.repeat(40));
    
    const emotionsEndpoint = `${BASE_URL}/api/v1/chats/messages?hasEmotion=true&limit=10`;
    console.log(`🎯 Endpoint: ${emotionsEndpoint}`);
    
    const emotionsResult = await makeRequest(emotionsEndpoint, YOUR_TOKEN);
    console.log(`📊 Status: ${emotionsResult.status}`);
    
    if (emotionsResult.status === 200) {
      const messages = emotionsResult.data.data?.messages || emotionsResult.data.messages || [];
      console.log(`✅ Found ${messages.length} messages with emotions`);
      
      if (messages.length > 0) {
        console.log('\n🎭 Messages with Emotions:');
        messages.forEach((msg, index) => {
          console.log(`${index + 1}. ${msg.content?.substring(0, 80) || 'No content'}...`);
          console.log(`   Emotion: ${msg.emotion?.label || 'No emotion'}`);
          console.log(`   Confidence: ${msg.emotion?.confidence || 'No confidence'}`);
          console.log(`   Favorited: ${msg.isFavorited ? 'Yes' : 'No'}`);
        });
      } else {
        console.log('⚠️  No messages with emotions found');
        console.log('💡 Messages need emotional analysis to become heart-to-hearts');
      }
    } else {
      console.log(`❌ Failed to get emotional messages: ${emotionsResult.status}`);
      console.log(`Response: ${emotionsResult.raw}`);
    }
    
    // Step 5: Test creating a chat and message
    console.log('\n4️⃣ Testing Chat Creation (to generate data)');
    console.log('-'.repeat(40));
    
    const createChatEndpoint = `${BASE_URL}/api/v1/chats`;
    const chatData = {
      name: 'Test Heart-to-Hearts Chat',
      description: 'Testing chat for heart-to-hearts functionality'
    };
    
    console.log(`🎯 Creating chat: ${createChatEndpoint}`);
    
    const createResult = await makeRequest(createChatEndpoint, YOUR_TOKEN, 'POST', chatData);
    console.log(`📊 Status: ${createResult.status}`);
    
    if (createResult.status === 200 || createResult.status === 201) {
      console.log('✅ Chat created successfully!');
      console.log(`Chat ID: ${createResult.data.data?.id || createResult.data.id}`);
      
      const newChatId = createResult.data.data?.id || createResult.data.id;
      
      if (newChatId) {
        // Try to send a message
        await sendTestMessage(newChatId);
      }
    } else {
      console.log(`❌ Failed to create chat: ${createResult.status}`);
      console.log(`Response: ${createResult.raw}`);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
  
  console.log('\n✨ Debug completed!');
}

async function checkChatMessages(chatId) {
  console.log(`\n📨 Checking Messages in Chat: ${chatId}`);
  console.log('-'.repeat(30));
  
  const messagesEndpoint = `${BASE_URL}/api/v1/chats/${chatId}/messages?limit=10`;
  console.log(`🎯 Endpoint: ${messagesEndpoint}`);
  
  const messagesResult = await makeRequest(messagesEndpoint, YOUR_TOKEN);
  console.log(`📊 Status: ${messagesResult.status}`);
  
  if (messagesResult.status === 200) {
    const messages = messagesResult.data.data?.messages || messagesResult.data.messages || [];
    console.log(`✅ Found ${messages.length} messages in this chat`);
    
    if (messages.length > 0) {
      console.log('\n💬 Chat Messages:');
      messages.forEach((msg, index) => {
        console.log(`${index + 1}. ${msg.content?.substring(0, 80) || 'No content'}...`);
        console.log(`   From: ${msg.sender || msg.role || 'Unknown'}`);
        console.log(`   Favorited: ${msg.isFavorited ? 'Yes' : 'No'}`);
        console.log(`   Has Emotion: ${msg.emotion ? 'Yes' : 'No'}`);
      });
    }
  } else {
    console.log(`❌ Failed to get messages: ${messagesResult.status}`);
  }
}

async function sendTestMessage(chatId) {
  console.log(`\n📤 Sending Test Message to Chat: ${chatId}`);
  console.log('-'.repeat(30));
  
  const messageEndpoint = `${BASE_URL}/api/v1/chats/${chatId}/messages`;
  const messageData = {
    content: 'I feel so grateful today. This moment of reflection brings me peace and joy. I want to remember this feeling forever.',
    role: 'user'
  };
  
  console.log(`🎯 Sending message: ${messageEndpoint}`);
  
  const messageResult = await makeRequest(messageEndpoint, YOUR_TOKEN, 'POST', messageData);
  console.log(`📊 Status: ${messageResult.status}`);
  
  if (messageResult.status === 200 || messageResult.status === 201) {
    console.log('✅ Message sent successfully!');
    const messageId = messageResult.data.data?.id || messageResult.data.id;
    console.log(`Message ID: ${messageId}`);
    
    if (messageId) {
      // Try to favorite the message
      await favoriteMessage(messageId);
    }
  } else {
    console.log(`❌ Failed to send message: ${messageResult.status}`);
    console.log(`Response: ${messageResult.raw}`);
  }
}

async function favoriteMessage(messageId) {
  console.log(`\n⭐ Favoriting Message: ${messageId}`);
  console.log('-'.repeat(30));
  
  const favoriteEndpoint = `${BASE_URL}/api/v1/messages/${messageId}/favorite`;
  
  console.log(`🎯 Favoriting: ${favoriteEndpoint}`);
  
  const favoriteResult = await makeRequest(favoriteEndpoint, YOUR_TOKEN, 'POST');
  console.log(`📊 Status: ${favoriteResult.status}`);
  
  if (favoriteResult.status === 200 || favoriteResult.status === 201) {
    console.log('✅ Message favorited successfully!');
    console.log('💡 Now wait a moment for emotional analysis, then check heart-to-hearts again');
  } else {
    console.log(`❌ Failed to favorite message: ${favoriteResult.status}`);
    console.log(`Response: ${favoriteResult.raw}`);
  }
}

// Run the debug
debugNoHeartData().catch(console.error);