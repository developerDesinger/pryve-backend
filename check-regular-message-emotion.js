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
        'User-Agent': 'Check-Regular-Message/1.0'
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

async function checkRegularMessageEmotion() {
  console.log('🔍 Checking Regular Message Emotion Detection');
  console.log('=' .repeat(60));
  
  try {
    // Get all chats and check messages in each
    const chatsResult = await makeRequest(`${BASE_URL}/api/v1/chats`, YOUR_TOKEN);
    
    if (chatsResult.status === 200) {
      const chats = chatsResult.data.data || [];
      console.log(`📝 Found ${chats.length} chats`);
      
      for (let i = 0; i < chats.length; i++) {
        const chat = chats[i];
        console.log(`\n📂 Chat ${i + 1}: ${chat.name} (ID: ${chat.id})`);
        
        const messagesResult = await makeRequest(
          `${BASE_URL}/api/v1/chats/${chat.id}/messages?limit=15`,
          YOUR_TOKEN
        );
        
        if (messagesResult.status === 200) {
          const messages = messagesResult.data.data?.messages || messagesResult.data.messages || [];
          const userMessages = messages.filter(m => !m.isFromAI);
          
          console.log(`   📨 Total messages: ${messages.length}, User messages: ${userMessages.length}`);
          
          if (userMessages.length > 0) {
            console.log('\n   📋 Recent User Messages:');
            
            userMessages.slice(0, 10).forEach((msg, index) => {
              console.log(`\n   ${index + 1}. ID: ${msg.id}`);
              console.log(`      Content: ${msg.content?.substring(0, 80)}...`);
              console.log(`      Emotion: ${msg.emotion || 'None'}`);
              console.log(`      Confidence: ${msg.emotionConfidence || 'N/A'}`);
              console.log(`      Favorited: ${msg.isFavorited ? 'Yes' : 'No'}`);
              console.log(`      Created: ${msg.createdAt}`);
              
              // Check if this is our regular test message
              const isRegularMessage = msg.content?.includes('regular test message') || 
                                     msg.content?.includes('weather is nice') ||
                                     msg.content?.includes('Nothing emotional here') ||
                                     msg.content?.includes('just testing the system');
              
              if (isRegularMessage) {
                console.log(`      🚨 THIS IS A REGULAR MESSAGE!`);
                if (msg.emotion && msg.emotionConfidence >= 0.5) {
                  console.log(`      ❌ PROBLEM: Regular message has high-confidence emotion!`);
                  console.log(`         Emotion: ${msg.emotion} (${msg.emotionConfidence})`);
                  console.log(`         This explains why it was auto-favorited and appears in journey`);
                } else if (msg.emotion) {
                  console.log(`      ⚠️  Regular message has low-confidence emotion: ${msg.emotion} (${msg.emotionConfidence})`);
                } else {
                  console.log(`      ✅ Regular message correctly has no emotion`);
                }
              }
              
              // Check if this is our emotional test message
              const isEmotionalMessage = msg.content?.includes('incredibly grateful and blessed') ||
                                        msg.content?.includes('pure joy and happiness') ||
                                        msg.content?.includes('cherish this beautiful feeling');
              
              if (isEmotionalMessage) {
                console.log(`      💝 THIS IS AN EMOTIONAL MESSAGE!`);
                if (msg.emotion && msg.emotionConfidence >= 0.5) {
                  console.log(`      ✅ CORRECT: Emotional message has high-confidence emotion!`);
                  console.log(`         Emotion: ${msg.emotion} (${msg.emotionConfidence})`);
                } else {
                  console.log(`      ❌ PROBLEM: Emotional message doesn't have high-confidence emotion`);
                }
              }
            });
          }
        }
      }
    }
    
    // Check the specific message IDs we know about
    console.log('\n🔍 Checking Specific Message IDs from Previous Test');
    console.log('-'.repeat(50));
    
    const knownMessageIds = [
      'cmkxoge050007peul0sp0vjd8', // Regular message
      'cmkxogv89000dpeulpxqokygh'  // Emotional message
    ];
    
    for (const messageId of knownMessageIds) {
      console.log(`\n📨 Checking message: ${messageId}`);
      
      // We can't directly get a single message, but we can check if it appears in journey
      const heartResult = await makeRequest(
        `${BASE_URL}/api/v1/chats/journey/messages?category=heart-to-hearts&limit=20`,
        YOUR_TOKEN
      );
      
      if (heartResult.status === 200) {
        const items = heartResult.data.data?.items || [];
        const foundMessage = items.find(item => item.id === messageId);
        
        if (foundMessage) {
          console.log(`   ✅ Found in heart-to-hearts:`);
          console.log(`      Title: ${foundMessage.title}`);
          console.log(`      Emotion: ${foundMessage.emotion?.label} (${foundMessage.emotion?.confidence})`);
          console.log(`      Primary Tag: ${foundMessage.primaryTag}`);
          console.log(`      Timestamp: ${foundMessage.timestamp}`);
        } else {
          console.log(`   ❌ Not found in heart-to-hearts`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
  
  console.log('\n✨ Regular Message Emotion Check Completed!');
}

// Run the check
checkRegularMessageEmotion().catch(console.error);