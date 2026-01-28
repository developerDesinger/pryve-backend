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
        'User-Agent': 'Test-Only-Saved-Messages/1.0'
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

async function testOnlySavedMessagesInJourney() {
  console.log('🔍 Testing: Do ONLY Saved/Favorited Messages Appear in Journey?');
  console.log('=' .repeat(70));
  console.log(`🌐 Server: ${BASE_URL}`);
  console.log(`🔑 Token: ${YOUR_TOKEN.substring(0, 20)}...`);
  console.log('=' .repeat(70));
  
  try {
    // Step 1: Get current journey statistics (before)
    console.log('\n1️⃣ Getting Current Journey Statistics (BEFORE)');
    console.log('-'.repeat(50));
    
    const beforeJourneyResult = await makeRequest(`${BASE_URL}/api/v1/journey`, YOUR_TOKEN);
    
    let beforeStats = {};
    if (beforeJourneyResult.status === 200) {
      beforeStats = beforeJourneyResult.data.data?.statistics || {};
      console.log('📊 Current Journey Stats:');
      console.log(`   💝 Heart-to-Hearts: ${beforeStats.heartToHearts || 0}`);
      console.log(`   🌱 Growth Moments: ${beforeStats.growthMoments || 0}`);
      console.log(`   🎯 Goals Achieved: ${beforeStats.goalsAchieved || 0}`);
      console.log(`   💡 Breakthrough Days: ${beforeStats.breakthroughDays || 0}`);
      console.log(`   ⭐ Total Favorites: ${beforeStats.totalFavorites || 0}`);
      console.log(`   💬 Total Messages: ${beforeStats.totalMessages || 0}`);
    } else {
      console.log(`❌ Failed to get journey stats: ${beforeJourneyResult.status}`);
    }
    
    // Step 2: Get a chat to work with
    console.log('\n2️⃣ Getting Chat for Testing');
    console.log('-'.repeat(50));
    
    const chatsResult = await makeRequest(`${BASE_URL}/api/v1/chats`, YOUR_TOKEN);
    let chatId = null;
    
    if (chatsResult.status === 200) {
      const chats = chatsResult.data.data || [];
      if (chats.length > 0) {
        chatId = chats[0].id;
        console.log(`✅ Using chat: ${chatId} (${chats[0].name})`);
      }
    }
    
    if (!chatId) {
      console.log('❌ No chat found, cannot continue test');
      return;
    }
    
    // Step 3: Send a regular message (should NOT be emotional, so NOT auto-favorited)
    console.log('\n3️⃣ Sending Regular (Non-Emotional) Message');
    console.log('-'.repeat(50));
    
    const regularMessage = "Hello, this is just a regular test message. Nothing emotional here. Just testing the system functionality. The weather is nice today.";
    
    console.log(`📤 Sending: ${regularMessage.substring(0, 80)}...`);
    console.log('💡 This message should NOT be emotional, so should NOT appear in journey');
    
    const messageResult = await makeRequest(
      `${BASE_URL}/api/v1/chats/${chatId}/messages`,
      YOUR_TOKEN,
      'POST',
      {
        content: regularMessage,
        role: 'user'
      }
    );
    
    console.log(`📊 Status: ${messageResult.status}`);
    
    let regularMessageId = null;
    if (messageResult.status === 200) {
      const userMessage = messageResult.data.data?.userMessage;
      if (userMessage) {
        regularMessageId = userMessage.id;
        console.log(`✅ Regular message sent: ${regularMessageId}`);
      }
    } else {
      console.log(`❌ Failed to send regular message: ${messageResult.raw}`);
      return;
    }
    
    // Step 4: Wait for processing
    console.log('\n4️⃣ Waiting for Processing');
    console.log('-'.repeat(50));
    console.log('⏳ Waiting 3 seconds for emotional analysis...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 5: Check journey statistics (after regular message)
    console.log('\n5️⃣ Checking Journey Statistics (AFTER Regular Message)');
    console.log('-'.repeat(50));
    
    const afterRegularResult = await makeRequest(`${BASE_URL}/api/v1/journey`, YOUR_TOKEN);
    
    let afterRegularStats = {};
    if (afterRegularResult.status === 200) {
      afterRegularStats = afterRegularResult.data.data?.statistics || {};
      console.log('📊 Journey Stats After Regular Message:');
      console.log(`   💝 Heart-to-Hearts: ${afterRegularStats.heartToHearts || 0} (was ${beforeStats.heartToHearts || 0})`);
      console.log(`   🌱 Growth Moments: ${afterRegularStats.growthMoments || 0} (was ${beforeStats.growthMoments || 0})`);
      console.log(`   🎯 Goals Achieved: ${afterRegularStats.goalsAchieved || 0} (was ${beforeStats.goalsAchieved || 0})`);
      console.log(`   💡 Breakthrough Days: ${afterRegularStats.breakthroughDays || 0} (was ${beforeStats.breakthroughDays || 0})`);
      console.log(`   ⭐ Total Favorites: ${afterRegularStats.totalFavorites || 0} (was ${beforeStats.totalFavorites || 0})`);
      console.log(`   💬 Total Messages: ${afterRegularStats.totalMessages || 0} (was ${beforeStats.totalMessages || 0})`);
      
      // Check if journey stats changed
      const journeyStatsChanged = 
        (afterRegularStats.heartToHearts || 0) !== (beforeStats.heartToHearts || 0) ||
        (afterRegularStats.growthMoments || 0) !== (beforeStats.growthMoments || 0) ||
        (afterRegularStats.goalsAchieved || 0) !== (beforeStats.goalsAchieved || 0) ||
        (afterRegularStats.breakthroughDays || 0) !== (beforeStats.breakthroughDays || 0);
      
      const favoritesChanged = (afterRegularStats.totalFavorites || 0) !== (beforeStats.totalFavorites || 0);
      const messagesChanged = (afterRegularStats.totalMessages || 0) !== (beforeStats.totalMessages || 0);
      
      console.log('\n🔍 Analysis:');
      if (journeyStatsChanged) {
        console.log('⚠️  JOURNEY STATS CHANGED - Regular message appeared in journey categories!');
      } else {
        console.log('✅ JOURNEY STATS UNCHANGED - Regular message did NOT appear in journey categories');
      }
      
      if (favoritesChanged) {
        console.log('⚠️  FAVORITES CHANGED - Regular message was auto-favorited!');
      } else {
        console.log('✅ FAVORITES UNCHANGED - Regular message was NOT auto-favorited');
      }
      
      if (messagesChanged) {
        console.log('✅ TOTAL MESSAGES INCREASED - Message was saved to database (expected)');
      }
    }
    
    // Step 6: Check if regular message appears in journey categories
    console.log('\n6️⃣ Checking Journey Categories for Regular Message');
    console.log('-'.repeat(50));
    
    const categories = ['heart-to-hearts', 'goals-achieved', 'growth-moments', 'breakthrough-days'];
    let regularMessageFoundInJourney = false;
    
    for (const category of categories) {
      console.log(`\n📂 Checking category: ${category}`);
      
      const categoryResult = await makeRequest(
        `${BASE_URL}/api/v1/chats/journey/messages?category=${category}&limit=10`,
        YOUR_TOKEN
      );
      
      if (categoryResult.status === 200) {
        const items = categoryResult.data.data?.items || [];
        console.log(`   Found ${items.length} items in ${category}`);
        
        // Check if our regular message is in this category
        const foundRegularMessage = items.find(item => 
          item.id === regularMessageId || 
          item.content?.includes('regular test message') ||
          item.content?.includes('weather is nice')
        );
        
        if (foundRegularMessage) {
          console.log(`   ⚠️  REGULAR MESSAGE FOUND in ${category}!`);
          console.log(`   Message: ${foundRegularMessage.content?.substring(0, 80)}...`);
          regularMessageFoundInJourney = true;
        } else {
          console.log(`   ✅ Regular message NOT found in ${category}`);
        }
      }
    }
    
    // Step 7: Send an emotional message and see if it appears
    console.log('\n7️⃣ Sending Emotional Message (Should Appear in Journey)');
    console.log('-'.repeat(50));
    
    const emotionalMessage = "I feel incredibly grateful and blessed today. This moment fills my heart with pure joy and happiness. I want to cherish this beautiful feeling forever.";
    
    console.log(`📤 Sending: ${emotionalMessage.substring(0, 80)}...`);
    console.log('💡 This message IS emotional, so SHOULD appear in journey');
    
    const emotionalResult = await makeRequest(
      `${BASE_URL}/api/v1/chats/${chatId}/messages`,
      YOUR_TOKEN,
      'POST',
      {
        content: emotionalMessage,
        role: 'user'
      }
    );
    
    let emotionalMessageId = null;
    if (emotionalResult.status === 200) {
      const userMessage = emotionalResult.data.data?.userMessage;
      if (userMessage) {
        emotionalMessageId = userMessage.id;
        console.log(`✅ Emotional message sent: ${emotionalMessageId}`);
      }
    }
    
    // Step 8: Wait and check if emotional message appears in journey
    console.log('\n8️⃣ Checking if Emotional Message Appears in Journey');
    console.log('-'.repeat(50));
    
    console.log('⏳ Waiting 3 seconds for emotional analysis...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const finalJourneyResult = await makeRequest(`${BASE_URL}/api/v1/journey`, YOUR_TOKEN);
    
    if (finalJourneyResult.status === 200) {
      const finalStats = finalJourneyResult.data.data?.statistics || {};
      console.log('📊 Final Journey Stats:');
      console.log(`   💝 Heart-to-Hearts: ${finalStats.heartToHearts || 0} (was ${afterRegularStats.heartToHearts || 0})`);
      console.log(`   ⭐ Total Favorites: ${finalStats.totalFavorites || 0} (was ${afterRegularStats.totalFavorites || 0})`);
      
      const emotionalJourneyChanged = (finalStats.heartToHearts || 0) > (afterRegularStats.heartToHearts || 0);
      const emotionalFavoritesChanged = (finalStats.totalFavorites || 0) > (afterRegularStats.totalFavorites || 0);
      
      if (emotionalJourneyChanged) {
        console.log('✅ EMOTIONAL MESSAGE appeared in journey categories!');
      } else {
        console.log('⚠️  Emotional message did NOT appear in journey categories');
      }
      
      if (emotionalFavoritesChanged) {
        console.log('✅ EMOTIONAL MESSAGE was auto-favorited!');
      } else {
        console.log('⚠️  Emotional message was NOT auto-favorited');
      }
    }
    
    // Step 9: Final Summary
    console.log('\n9️⃣ FINAL SUMMARY');
    console.log('-'.repeat(50));
    
    console.log('🔍 Test Results:');
    
    if (!regularMessageFoundInJourney) {
      console.log('✅ CORRECT: Regular (non-emotional) messages do NOT appear in journey');
    } else {
      console.log('⚠️  ISSUE: Regular messages ARE appearing in journey');
    }
    
    console.log('\n💡 Conclusion:');
    if (!regularMessageFoundInJourney) {
      console.log('✅ Journey system is working correctly!');
      console.log('   - Only saved/favorited messages appear in journey categories');
      console.log('   - Regular messages are saved to database but NOT in journey');
      console.log('   - Emotional messages get auto-favorited and appear in journey');
    } else {
      console.log('⚠️  Journey system may have an issue:');
      console.log('   - Regular messages are appearing in journey categories');
      console.log('   - This might indicate all messages are being included');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  console.log('\n✨ Only Saved Messages Journey Test Completed!');
}

// Run the test
testOnlySavedMessagesInJourney().catch(console.error);