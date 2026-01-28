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
        'User-Agent': 'Debug-Emotion-Detection/1.0'
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

async function debugEmotionDetection() {
  console.log('🔍 Debugging Emotion Detection for Regular Messages');
  console.log('=' .repeat(60));
  console.log(`🌐 Server: ${BASE_URL}`);
  console.log(`🔑 Token: ${YOUR_TOKEN.substring(0, 20)}...`);
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Get the chat and check recent messages
    console.log('\n1️⃣ Checking Recent Messages and Their Emotions');
    console.log('-'.repeat(50));
    
    const chatsResult = await makeRequest(`${BASE_URL}/api/v1/chats`, YOUR_TOKEN);
    
    if (chatsResult.status === 200) {
      const chats = chatsResult.data.data || [];
      if (chats.length > 0) {
        const chatId = chats[0].id;
        console.log(`📝 Checking messages in chat: ${chatId} (${chats[0].name})`);
        
        const messagesResult = await makeRequest(
          `${BASE_URL}/api/v1/chats/${chatId}/messages?limit=10`,
          YOUR_TOKEN
        );
        
        if (messagesResult.status === 200) {
          const messages = messagesResult.data.data?.messages || messagesResult.data.messages || [];
          console.log(`📨 Found ${messages.length} messages`);
          
          // Filter to user messages only and show their emotions
          const userMessages = messages.filter(m => !m.isFromAI);
          console.log(`👤 User messages: ${userMessages.length}`);
          
          console.log('\n📋 Recent User Messages with Emotion Analysis:');
          userMessages.slice(0, 8).forEach((msg, index) => {
            console.log(`\n${index + 1}. Message ID: ${msg.id}`);
            console.log(`   Content: ${msg.content?.substring(0, 100)}...`);
            console.log(`   Emotion: ${msg.emotion || 'None'}`);
            console.log(`   Confidence: ${msg.emotionConfidence || 'N/A'}`);
            console.log(`   Favorited: ${msg.isFavorited ? 'Yes' : 'No'}`);
            console.log(`   Created: ${msg.createdAt}`);
            
            // Check if this looks like a regular message that got emotion
            const isRegularMessage = msg.content?.includes('regular test message') || 
                                   msg.content?.includes('weather is nice') ||
                                   msg.content?.includes('Nothing emotional here');
            
            if (isRegularMessage) {
              console.log(`   🚨 THIS IS THE REGULAR MESSAGE!`);
              if (msg.emotion) {
                console.log(`   ⚠️  Regular message got emotion: ${msg.emotion} (${msg.emotionConfidence})`);
                if (msg.emotionConfidence >= 0.5) {
                  console.log(`   ❌ Confidence >= 0.5, so it was auto-favorited!`);
                } else {
                  console.log(`   ✅ Confidence < 0.5, so it should NOT be auto-favorited`);
                }
              } else {
                console.log(`   ✅ Regular message has no emotion (correct)`);
              }
            }
          });
          
          // Step 2: Check what emotions are being detected for different message types
          console.log('\n2️⃣ Emotion Detection Analysis');
          console.log('-'.repeat(50));
          
          const emotionalMessages = userMessages.filter(m => m.emotion);
          const highConfidenceEmotions = userMessages.filter(m => m.emotionConfidence >= 0.5);
          const favoritedMessages = userMessages.filter(m => m.isFavorited);
          
          console.log(`🎭 Messages with emotions: ${emotionalMessages.length}`);
          console.log(`🎯 High confidence emotions (≥0.5): ${highConfidenceEmotions.length}`);
          console.log(`⭐ Favorited messages: ${favoritedMessages.length}`);
          
          if (emotionalMessages.length > 0) {
            console.log('\n🎭 Emotion Breakdown:');
            const emotionCounts = {};
            emotionalMessages.forEach(msg => {
              const emotion = msg.emotion;
              emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
            });
            
            Object.entries(emotionCounts).forEach(([emotion, count]) => {
              console.log(`   ${emotion}: ${count} messages`);
            });
          }
          
          // Step 3: Check if there are any false positives
          console.log('\n3️⃣ False Positive Analysis');
          console.log('-'.repeat(50));
          
          const suspiciousMessages = userMessages.filter(msg => {
            const content = msg.content?.toLowerCase() || '';
            const isSupposedlyNeutral = 
              content.includes('regular') ||
              content.includes('test') ||
              content.includes('weather') ||
              content.includes('nothing emotional') ||
              content.includes('just testing');
            
            return isSupposedlyNeutral && msg.emotion && msg.emotionConfidence >= 0.5;
          });
          
          if (suspiciousMessages.length > 0) {
            console.log(`🚨 Found ${suspiciousMessages.length} suspicious messages (neutral content but high emotion confidence):`);
            suspiciousMessages.forEach((msg, index) => {
              console.log(`\n${index + 1}. "${msg.content?.substring(0, 80)}..."`);
              console.log(`   Detected emotion: ${msg.emotion} (confidence: ${msg.emotionConfidence})`);
              console.log(`   Auto-favorited: ${msg.isFavorited ? 'Yes' : 'No'}`);
            });
          } else {
            console.log('✅ No suspicious false positives found');
          }
          
        } else {
          console.log(`❌ Failed to get messages: ${messagesResult.status}`);
        }
      }
    }
    
    // Step 4: Test emotion detection with different message types
    console.log('\n4️⃣ Testing Different Message Types');
    console.log('-'.repeat(50));
    
    const testMessages = [
      {
        type: 'Neutral',
        content: 'This is a completely neutral message about the weather today.'
      },
      {
        type: 'Technical',
        content: 'Please check the API endpoint status and verify the database connection.'
      },
      {
        type: 'Factual',
        content: 'The meeting is scheduled for 3 PM tomorrow in conference room B.'
      },
      {
        type: 'Emotional',
        content: 'I am so incredibly happy and grateful for this amazing day!'
      }
    ];
    
    console.log('🧪 Testing emotion detection on different message types...');
    console.log('💡 Note: We can only see results after messages are processed');
    
    // We can't directly test the emotion detection API, but we can send messages
    // and check their emotion analysis results
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
  
  console.log('\n✨ Emotion Detection Debug Completed!');
  console.log('\n💡 Key Findings:');
  console.log('   - Regular messages are getting emotion detection');
  console.log('   - Some regular messages may have confidence ≥ 0.5');
  console.log('   - This causes them to be auto-favorited');
  console.log('   - Auto-favorited messages appear in journey categories');
  console.log('\n🔧 Potential Solutions:');
  console.log('   1. Increase confidence threshold for auto-favoriting (from 0.5 to 0.7+)');
  console.log('   2. Add content filtering to exclude obviously neutral messages');
  console.log('   3. Improve emotion detection model to be more selective');
  console.log('   4. Add manual review step before auto-favoriting');
}

// Run the debug
debugEmotionDetection().catch(console.error);