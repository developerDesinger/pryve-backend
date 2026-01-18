const https = require('https');

// Using the valid token we generated
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNta2pzM3FycTAwM2xwZXYwZDNxZ3VpdHoiLCJyb2xlIjoiQ0xJRU5UIiwiaWF0IjoxNzY4NzQzMzE4LCJleHAiOjE3NjkzNDgxMTh9.uF0vS7xdS7G4F3qNBgTgbYZ5apkfhPYfgtlhuLKk1KU';
const BASE_URL = 'https://pryve-backend.projectco.space/api/v1';

// From the previous responses
const CHAT_ID = 'cmkjslxxl003qpev0iabetui8';

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
        'User-Agent': 'Create-Third-Message/1.0'
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

async function createThirdMessage() {
  console.log('💝 Creating Third Emotional Message for Heart-to-Hearts');
  console.log('=' .repeat(70));
  console.log('💡 Heart-to-hearts requires >= 3 favorited emotional messages in a chat');
  console.log(`💬 Chat ID: ${CHAT_ID}`);
  console.log('=' .repeat(70));
  
  try {
    // Step 1: Create a third emotional message
    console.log('\n1️⃣ Creating third emotional message...');
    console.log('-'.repeat(50));
    
    const thirdMessage = {
      content: "I just had the most vulnerable and beautiful conversation with my closest friend. We shared our deepest fears and dreams, and I felt so seen and understood. There's something magical about being completely authentic with someone and feeling their love and acceptance in return. My heart feels so full of connection and gratitude right now.",
      type: 'text'
    };
    
    console.log(`💬 Message: ${thirdMessage.content.substring(0, 100)}...`);
    
    const messageResult = await makeRequest(`${BASE_URL}/chats/${CHAT_ID}/messages`, 'POST', thirdMessage);
    console.log(`📊 Message creation status: ${messageResult.status}`);
    
    let messageId;
    if (messageResult.status === 200 && messageResult.data?.data?.userMessage) {
      messageId = messageResult.data.data.userMessage.id;
      console.log(`✅ Third message created! ID: ${messageId}`);
      console.log(`😊 AI detected emotion: ${messageResult.data.data.userMessage.emotion || 'Processing...'}`);
    } else {
      console.log(`❌ Message creation failed: ${messageResult.raw}`);
      return;
    }
    
    // Step 2: Favorite the third message
    console.log('\n2️⃣ Favoriting the third message...');
    console.log('-'.repeat(50));
    
    const favoriteResult = await makeRequest(`${BASE_URL}/chats/${CHAT_ID}/messages/${messageId}/favorite`, 'POST');
    console.log(`📊 Favorite status: ${favoriteResult.status}`);
    
    if (favoriteResult.status === 200 || favoriteResult.status === 201) {
      console.log(`✅ Third message favorited successfully!`);
    } else {
      console.log(`❌ Favorite failed: ${favoriteResult.raw}`);
      return;
    }
    
    // Step 3: Check current favorite count
    console.log('\n3️⃣ Checking favorite messages count...');
    console.log('-'.repeat(50));
    
    const favoritesResult = await makeRequest(`${BASE_URL}/chats/favorites/messages`);
    
    if (favoritesResult.status === 200 && favoritesResult.data?.data) {
      const favoriteCount = favoritesResult.data.data.length;
      console.log(`📊 Total favorite messages: ${favoriteCount}`);
      
      if (favoriteCount >= 3) {
        console.log('✅ We now have >= 3 favorite messages!');
        
        // Show the emotions of our favorite messages
        console.log('\n📊 Favorite messages emotions:');
        favoritesResult.data.data.forEach((fav, index) => {
          console.log(`${index + 1}. Emotion: ${fav.emotion || 'Not analyzed'} (${fav.emotionConfidence || 'N/A'})`);
          console.log(`   Content: ${fav.content?.substring(0, 80)}...`);
        });
      } else {
        console.log(`⚠️ Still only ${favoriteCount} favorite messages, need at least 3`);
      }
    }
    
    // Step 4: Wait for emotion analysis
    console.log('\n4️⃣ Waiting for emotion analysis...');
    console.log('-'.repeat(50));
    console.log('⏳ Waiting 8 seconds for AI emotion analysis...');
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    // Step 5: Test heart-to-hearts endpoint
    console.log('\n5️⃣ Testing heart-to-hearts endpoint...');
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
        console.log('\n🎉 SUCCESS! HEART-TO-HEARTS MESSAGES FOUND!');
        console.log('=' .repeat(70));
        
        items.forEach((item, index) => {
          console.log(`\n💝 ${index + 1}. Heart-to-Hearts Message:`);
          console.log(`   📝 ID: ${item.id}`);
          console.log(`   📰 Title: ${item.title || 'No title'}`);
          console.log(`   💬 Content: ${item.content?.substring(0, 150)}...`);
          console.log(`   😊 Emotion: ${item.emotion?.label} (confidence: ${item.emotion?.confidence})`);
          console.log(`   📅 Created: ${item.createdAt}`);
          console.log(`   ⭐ Is Favorite: ${item.isFavorite}`);
          console.log(`   💬 Chat: ${item.chat?.name || 'Unknown'}`);
        });
        
        console.log('\n🎉 ENDPOINT TEST SUCCESSFUL!');
        console.log('✅ Heart-to-hearts endpoint now returns data!');
        console.log('✅ The requirement of >= 3 favorited emotional messages is met!');
        
      } else {
        console.log('\n⚠️ Still no heart-to-hearts messages found');
        console.log('💡 Let\'s check what might be missing...');
        
        // Debug: Check the messages in our chat
        const messagesResult = await makeRequest(`${BASE_URL}/chats/${CHAT_ID}/messages`);
        
        if (messagesResult.status === 200 && messagesResult.data?.data) {
          console.log('\n🔍 Debug - Messages in our chat:');
          const userMessages = messagesResult.data.data.filter(m => !m.isFromAI);
          
          userMessages.forEach((msg, index) => {
            console.log(`${index + 1}. User Message:`);
            console.log(`   ID: ${msg.id}`);
            console.log(`   Emotion: ${msg.emotion || 'Not analyzed'}`);
            console.log(`   Confidence: ${msg.emotionConfidence || 'N/A'}`);
            console.log(`   Content: ${msg.content?.substring(0, 60)}...`);
          });
          
          const emotionalMessages = userMessages.filter(m => m.emotion && m.emotionConfidence >= 0.6);
          console.log(`\n📊 Messages with emotion >= 0.6 confidence: ${emotionalMessages.length}`);
          
          if (emotionalMessages.length >= 3) {
            console.log('✅ We have >= 3 emotional messages!');
            console.log('💡 The issue might be that they need to be favorited AND in the same chat');
          }
        }
      }
    }
    
    // Step 6: Check updated journey statistics
    console.log('\n6️⃣ Final journey statistics...');
    console.log('-'.repeat(50));
    
    const journeyResult = await makeRequest(`${BASE_URL}/journey`);
    
    if (journeyResult.status === 200 && journeyResult.data?.data?.statistics) {
      const stats = journeyResult.data.data.statistics;
      console.log('📊 Final Journey Statistics:');
      console.log(`   Total Messages: ${stats.totalMessages}`);
      console.log(`   Total Favorites: ${stats.totalFavorites}`);
      console.log(`   Heart to Hearts: ${stats.heartToHearts}`);
      console.log(`   Growth Moments: ${stats.growthMoments}`);
      console.log(`   Goals Achieved: ${stats.goalsAchieved}`);
      console.log(`   Breakthrough Days: ${stats.breakthroughDays}`);
      
      if (stats.heartToHearts > 0) {
        console.log('\n🎉 HEART-TO-HEARTS COUNT INCREASED!');
        console.log('✅ The endpoint should now return data!');
      }
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  }
  
  console.log('\n🏁 TEST COMPLETED');
  console.log('=' .repeat(70));
  console.log('💡 Summary: Heart-to-hearts requires >= 3 favorited emotional messages in the same chat');
  console.log('📊 If successful, the endpoint should now return our emotional messages!');
}

if (require.main === module) {
  createThirdMessage().catch(console.error);
}

module.exports = { createThirdMessage };