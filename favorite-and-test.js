const https = require('https');

// Using the valid token we generated
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNta2pzM3FycTAwM2xwZXYwZDNxZ3VpdHoiLCJyb2xlIjoiQ0xJRU5UIiwiaWF0IjoxNzY4NzQzMzE4LCJleHAiOjE3NjkzNDgxMTh9.uF0vS7xdS7G4F3qNBgTgbYZ5apkfhPYfgtlhuLKk1KU';
const BASE_URL = 'https://pryve-backend.projectco.space/api/v1';

// From the previous response, we know we have:
const CHAT_ID = 'cmkjslxxl003qpev0iabetui8';
const MESSAGE_ID = 'cmkjsm0jd003spev09ijzwl8h'; // The user message ID from the response

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
        'User-Agent': 'Favorite-And-Test/1.0'
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

async function favoriteAndTest() {
  console.log('⭐ Favoriting Message and Testing Heart-to-Hearts');
  console.log('=' .repeat(70));
  console.log(`💬 Chat ID: ${CHAT_ID}`);
  console.log(`📝 Message ID: ${MESSAGE_ID}`);
  console.log('=' .repeat(70));
  
  try {
    // Step 1: Favorite the emotional message
    console.log('\n1️⃣ Favoriting the emotional message...');
    console.log('-'.repeat(50));
    
    const favoriteUrl = `${BASE_URL}/chats/${CHAT_ID}/messages/${MESSAGE_ID}/favorite`;
    console.log(`🔗 Favorite URL: ${favoriteUrl}`);
    
    const favoriteResult = await makeRequest(favoriteUrl, 'POST');
    console.log(`📊 Favorite status: ${favoriteResult.status}`);
    console.log(`📄 Favorite response: ${favoriteResult.raw}`);
    
    if (favoriteResult.status === 200 || favoriteResult.status === 201) {
      console.log(`✅ Message favorited successfully!`);
    } else {
      console.log(`⚠️ Favorite failed, trying toggle method...`);
      
      // Try toggle favorite endpoint
      const toggleUrl = `${BASE_URL}/chats/${CHAT_ID}/messages/${MESSAGE_ID}/toggle-favorite`;
      const toggleResult = await makeRequest(toggleUrl, 'POST');
      console.log(`📊 Toggle favorite status: ${toggleResult.status}`);
      console.log(`📄 Toggle response: ${toggleResult.raw}`);
      
      if (toggleResult.status === 200 || toggleResult.status === 201) {
        console.log(`✅ Message favorited via toggle!`);
      }
    }
    
    // Step 2: Check if we can get the message details
    console.log('\n2️⃣ Getting message details...');
    console.log('-'.repeat(50));
    
    const messagesUrl = `${BASE_URL}/chats/${CHAT_ID}/messages`;
    const messagesResult = await makeRequest(messagesUrl);
    console.log(`📊 Messages status: ${messagesResult.status}`);
    
    if (messagesResult.status === 200 && messagesResult.data?.data) {
      const messages = messagesResult.data.data;
      console.log(`📊 Found ${messages.length} messages in chat`);
      
      const ourMessage = messages.find(m => m.id === MESSAGE_ID);
      if (ourMessage) {
        console.log('✅ Found our message:');
        console.log(`   Content: ${ourMessage.content?.substring(0, 100)}...`);
        console.log(`   Emotion: ${ourMessage.emotion || 'Not analyzed yet'}`);
        console.log(`   Emotion Confidence: ${ourMessage.emotionConfidence || 'N/A'}`);
        console.log(`   Is Favorite: ${ourMessage.isFavorite || 'Unknown'}`);
      } else {
        console.log('⚠️ Could not find our specific message');
      }
    }
    
    // Step 3: Check favorite messages endpoint
    console.log('\n3️⃣ Checking favorite messages...');
    console.log('-'.repeat(50));
    
    const favoritesUrl = `${BASE_URL}/chats/favorites/messages`;
    const favoritesResult = await makeRequest(favoritesUrl);
    console.log(`📊 Favorites status: ${favoritesResult.status}`);
    
    if (favoritesResult.status === 200) {
      console.log(`📄 Favorites response: ${favoritesResult.raw}`);
      
      if (favoritesResult.data?.data?.length > 0) {
        console.log(`✅ Found ${favoritesResult.data.data.length} favorite messages!`);
        
        favoritesResult.data.data.forEach((fav, index) => {
          console.log(`${index + 1}. ${fav.content?.substring(0, 80)}...`);
          console.log(`   Emotion: ${fav.emotion || 'Not analyzed'}`);
        });
      } else {
        console.log('⚠️ No favorite messages found yet');
      }
    }
    
    // Step 4: Wait for emotion analysis processing
    console.log('\n4️⃣ Waiting for emotion analysis...');
    console.log('-'.repeat(50));
    console.log('⏳ Waiting 10 seconds for AI emotion analysis to complete...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
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
        
        // Let's check what emotions are being detected
        console.log('\n🔍 Checking message details again for emotion analysis...');
        const reCheckMessages = await makeRequest(messagesUrl);
        
        if (reCheckMessages.status === 200 && reCheckMessages.data?.data) {
          const messages = reCheckMessages.data.data;
          console.log('\n📊 Current message emotions:');
          
          messages.forEach((msg, index) => {
            if (!msg.isFromAI) {
              console.log(`${index + 1}. User Message:`);
              console.log(`   Content: ${msg.content?.substring(0, 80)}...`);
              console.log(`   Emotion: ${msg.emotion || 'Not analyzed'}`);
              console.log(`   Confidence: ${msg.emotionConfidence || 'N/A'}`);
              console.log(`   Is Favorite: ${msg.isFavorite || false}`);
            }
          });
        }
      }
    }
    
    // Step 6: Check updated journey statistics
    console.log('\n6️⃣ Checking updated journey statistics...');
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
      
      if (stats.totalFavorites > 0) {
        console.log('\n✅ Message was favorited successfully!');
      }
      if (stats.heartToHearts > 0) {
        console.log('✅ Heart-to-hearts count increased!');
      }
    }
    
    // Step 7: Create another message with explicit emotion data
    console.log('\n7️⃣ Creating another message with explicit emotion...');
    console.log('-'.repeat(50));
    
    const explicitEmotionMessage = {
      content: "I'm feeling so grateful and loved after sharing my deepest feelings with someone special. This connection means everything to me.",
      type: 'text',
      emotion: 'love',
      emotionConfidence: 0.95
    };
    
    const explicitResult = await makeRequest(`${BASE_URL}/chats/${CHAT_ID}/messages`, 'POST', explicitEmotionMessage);
    console.log(`📊 Explicit emotion message status: ${explicitResult.status}`);
    
    if (explicitResult.status === 200 && explicitResult.data?.data?.userMessage) {
      const newMessageId = explicitResult.data.data.userMessage.id;
      console.log(`✅ New message created with ID: ${newMessageId}`);
      
      // Favorite this message too
      const newFavoriteResult = await makeRequest(`${BASE_URL}/chats/${CHAT_ID}/messages/${newMessageId}/favorite`, 'POST');
      console.log(`📊 New message favorite status: ${newFavoriteResult.status}`);
      
      if (newFavoriteResult.status === 200 || newFavoriteResult.status === 201) {
        console.log('✅ New message favorited!');
        
        // Wait and test again
        console.log('⏳ Waiting 5 seconds and testing again...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const finalHeartResult = await makeRequest(heartUrl);
        console.log('\n📄 FINAL HEART-TO-HEARTS TEST:');
        console.log(JSON.stringify(finalHeartResult.data, null, 2));
        
        if (finalHeartResult.data?.data?.items?.length > 0) {
          console.log('\n🎉 SUCCESS! Found heart-to-hearts messages!');
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
  favoriteAndTest().catch(console.error);
}

module.exports = { favoriteAndTest };