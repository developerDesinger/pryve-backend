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
        'User-Agent': 'Test-Neutral-Fix/1.0'
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

async function testNeutralEmotionFix() {
  console.log('🔧 Testing Neutral Emotion Fix');
  console.log('=' .repeat(60));
  console.log(`🌐 Server: ${BASE_URL}`);
  console.log(`🔑 Token: ${YOUR_TOKEN.substring(0, 20)}...`);
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Get current journey statistics (before)
    console.log('\n1️⃣ Getting Current Journey Statistics (BEFORE Fix Test)');
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
    }
    
    // Step 2: Check current heart-to-hearts messages
    console.log('\n2️⃣ Checking Current Heart-to-Hearts Messages');
    console.log('-'.repeat(50));
    
    const heartResult = await makeRequest(
      `${BASE_URL}/api/v1/chats/journey/messages?category=heart-to-hearts&limit=20`,
      YOUR_TOKEN
    );
    
    if (heartResult.status === 200) {
      const items = heartResult.data.data?.items || [];
      console.log(`📝 Found ${items.length} heart-to-hearts messages`);
      
      // Check if any have neutral emotions
      const neutralMessages = items.filter(item => 
        item.emotion?.label === 'neutral'
      );
      
      const nonNeutralMessages = items.filter(item => 
        item.emotion?.label && item.emotion.label !== 'neutral'
      );
      
      const noEmotionMessages = items.filter(item => 
        !item.emotion?.label
      );
      
      console.log(`   🔍 Analysis:`);
      console.log(`      Neutral emotions: ${neutralMessages.length}`);
      console.log(`      Non-neutral emotions: ${nonNeutralMessages.length}`);
      console.log(`      No emotion: ${noEmotionMessages.length}`);
      
      if (neutralMessages.length > 0) {
        console.log('\n   ❌ NEUTRAL MESSAGES STILL IN HEART-TO-HEARTS:');
        neutralMessages.forEach((msg, index) => {
          console.log(`      ${index + 1}. ${msg.title?.substring(0, 60)}...`);
          console.log(`         Emotion: ${msg.emotion.label} (${msg.emotion.confidence})`);
          console.log(`         Primary Tag: ${msg.primaryTag}`);
        });
        console.log('\n   💡 The fix may need to be deployed or there may be cached data');
      } else {
        console.log('\n   ✅ NO NEUTRAL MESSAGES IN HEART-TO-HEARTS (Fix working!)');
      }
      
      if (nonNeutralMessages.length > 0) {
        console.log('\n   ✅ NON-NEUTRAL EMOTIONAL MESSAGES (Should be here):');
        nonNeutralMessages.slice(0, 5).forEach((msg, index) => {
          console.log(`      ${index + 1}. ${msg.title?.substring(0, 60)}...`);
          console.log(`         Emotion: ${msg.emotion.label} (${msg.emotion.confidence})`);
          console.log(`         Primary Tag: ${msg.primaryTag}`);
        });
      }
    }
    
    // Step 3: Check breakthrough-days for neutral emotions
    console.log('\n3️⃣ Checking Breakthrough Days for Neutral Emotions');
    console.log('-'.repeat(50));
    
    const breakthroughResult = await makeRequest(
      `${BASE_URL}/api/v1/chats/journey/messages?category=breakthrough-days&limit=20`,
      YOUR_TOKEN
    );
    
    if (breakthroughResult.status === 200) {
      const items = breakthroughResult.data.data?.items || [];
      console.log(`📝 Found ${items.length} breakthrough-days messages`);
      
      const neutralMessages = items.filter(item => 
        item.emotion?.label === 'neutral'
      );
      
      if (neutralMessages.length > 0) {
        console.log(`   ❌ Found ${neutralMessages.length} neutral messages in breakthrough-days`);
        neutralMessages.forEach((msg, index) => {
          console.log(`      ${index + 1}. ${msg.title?.substring(0, 60)}...`);
        });
      } else {
        console.log(`   ✅ No neutral messages in breakthrough-days (Fix working!)`);
      }
    }
    
    // Step 4: Send a new neutral message to test the fix
    console.log('\n4️⃣ Testing Fix with New Neutral Message');
    console.log('-'.repeat(50));
    
    const chatsResult = await makeRequest(`${BASE_URL}/api/v1/chats`, YOUR_TOKEN);
    let chatId = null;
    
    if (chatsResult.status === 200) {
      const chats = chatsResult.data.data || [];
      if (chats.length > 0) {
        chatId = chats[0].id;
        console.log(`✅ Using chat: ${chatId}`);
      }
    }
    
    if (chatId) {
      const neutralTestMessage = "This is another neutral test message to verify the fix. The system should detect this as neutral and NOT auto-favorite it. Testing 123.";
      
      console.log(`📤 Sending neutral test message: ${neutralTestMessage.substring(0, 80)}...`);
      console.log('💡 This should NOT be auto-favorited with the fix');
      
      const messageResult = await makeRequest(
        `${BASE_URL}/api/v1/chats/${chatId}/messages`,
        YOUR_TOKEN,
        'POST',
        {
          content: neutralTestMessage,
          role: 'user'
        }
      );
      
      if (messageResult.status === 200) {
        console.log('✅ Message sent successfully');
        
        // Wait for processing
        console.log('⏳ Waiting 5 seconds for emotion analysis...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check if journey stats changed
        const afterJourneyResult = await makeRequest(`${BASE_URL}/api/v1/journey`, YOUR_TOKEN);
        
        if (afterJourneyResult.status === 200) {
          const afterStats = afterJourneyResult.data.data?.statistics || {};
          
          console.log('\n📊 Journey Stats After New Neutral Message:');
          console.log(`   💝 Heart-to-Hearts: ${afterStats.heartToHearts || 0} (was ${beforeStats.heartToHearts || 0})`);
          console.log(`   ⭐ Total Favorites: ${afterStats.totalFavorites || 0} (was ${beforeStats.totalFavorites || 0})`);
          console.log(`   💬 Total Messages: ${afterStats.totalMessages || 0} (was ${beforeStats.totalMessages || 0})`);
          
          const heartToHeartsChanged = (afterStats.heartToHearts || 0) !== (beforeStats.heartToHearts || 0);
          const favoritesChanged = (afterStats.totalFavorites || 0) !== (beforeStats.totalFavorites || 0);
          const messagesChanged = (afterStats.totalMessages || 0) !== (beforeStats.totalMessages || 0);
          
          console.log('\n🔍 Fix Verification:');
          if (!heartToHeartsChanged) {
            console.log('✅ Heart-to-Hearts count unchanged (neutral message excluded) - FIX WORKING!');
          } else {
            console.log('❌ Heart-to-Hearts count changed (neutral message included) - Fix not working');
          }
          
          if (!favoritesChanged) {
            console.log('✅ Favorites count unchanged (neutral message not auto-favorited) - FIX WORKING!');
          } else {
            console.log('❌ Favorites count changed (neutral message auto-favorited) - Fix not working');
          }
          
          if (messagesChanged) {
            console.log('✅ Total messages increased (message saved to database) - Expected');
          }
        }
      } else {
        console.log(`❌ Failed to send test message: ${messageResult.status}`);
      }
    }
    
    // Step 5: Summary
    console.log('\n5️⃣ Fix Summary');
    console.log('-'.repeat(50));
    
    console.log('🔧 Changes Made:');
    console.log('   1. Auto-favorite logic now excludes neutral emotions');
    console.log('   2. Heart-to-hearts category excludes neutral emotions');
    console.log('   3. Breakthrough-days category excludes neutral emotions');
    console.log('   4. Journey statistics exclude neutral emotions from counts');
    
    console.log('\n💡 Expected Behavior:');
    console.log('   ✅ Emotional messages (joy, sadness, etc.) → Auto-favorited → Appear in journey');
    console.log('   ❌ Neutral messages → NOT auto-favorited → Do NOT appear in journey');
    console.log('   ✅ Messages without emotion analysis → Can be manually favorited → Appear in journey');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  console.log('\n✨ Neutral Emotion Fix Test Completed!');
}

// Run the test
testNeutralEmotionFix().catch(console.error);