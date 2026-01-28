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
        'User-Agent': 'Cleanup-Neutral-Favorites/1.0'
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

async function cleanupNeutralFavorites() {
  console.log('🧹 Cleanup Script for Neutral Emotion Favorites');
  console.log('=' .repeat(60));
  console.log(`🌐 Server: ${BASE_URL}`);
  console.log(`🔑 Token: ${YOUR_TOKEN.substring(0, 20)}...`);
  console.log('=' .repeat(60));
  
  console.log('\n⚠️  NOTE: This script identifies neutral favorites but cannot remove them directly.');
  console.log('Database cleanup requires direct database access or admin API endpoints.');
  
  try {
    // Step 1: Identify neutral messages in journey categories
    console.log('\n1️⃣ Identifying Neutral Messages in Journey Categories');
    console.log('-'.repeat(50));
    
    const categories = ['heart-to-hearts', 'breakthrough-days'];
    const neutralMessagesToCleanup = [];
    
    for (const category of categories) {
      console.log(`\n📂 Checking ${category}:`);
      
      const categoryResult = await makeRequest(
        `${BASE_URL}/api/v1/chats/journey/messages?category=${category}&limit=50`,
        YOUR_TOKEN
      );
      
      if (categoryResult.status === 200) {
        const items = categoryResult.data.data?.items || [];
        const neutralItems = items.filter(item => 
          item.emotion?.label === 'neutral'
        );
        
        console.log(`   Total items: ${items.length}`);
        console.log(`   Neutral items: ${neutralItems.length}`);
        
        if (neutralItems.length > 0) {
          console.log(`   🚨 Found ${neutralItems.length} neutral messages that should be cleaned up:`);
          neutralItems.forEach((item, index) => {
            console.log(`      ${index + 1}. ID: ${item.id}`);
            console.log(`         Content: ${item.title?.substring(0, 60)}...`);
            console.log(`         Emotion: ${item.emotion.label} (${item.emotion.confidence})`);
            
            neutralMessagesToCleanup.push({
              id: item.id,
              category: category,
              content: item.title,
              emotion: item.emotion.label,
              confidence: item.emotion.confidence
            });
          });
        } else {
          console.log(`   ✅ No neutral messages found in ${category}`);
        }
      } else {
        console.log(`   ❌ Failed to check ${category}: ${categoryResult.status}`);
      }
    }
    
    // Step 2: Summary of cleanup needed
    console.log('\n2️⃣ Cleanup Summary');
    console.log('-'.repeat(50));
    
    if (neutralMessagesToCleanup.length > 0) {
      console.log(`🚨 Found ${neutralMessagesToCleanup.length} neutral messages that need cleanup:`);
      
      const uniqueMessageIds = [...new Set(neutralMessagesToCleanup.map(m => m.id))];
      console.log(`📝 Unique message IDs to unfavorite: ${uniqueMessageIds.length}`);
      
      console.log('\n📋 Messages to cleanup:');
      uniqueMessageIds.forEach((id, index) => {
        const message = neutralMessagesToCleanup.find(m => m.id === id);
        console.log(`${index + 1}. ${id}`);
        console.log(`   Content: ${message.content?.substring(0, 80)}...`);
        console.log(`   Emotion: ${message.emotion} (${message.confidence})`);
      });
      
      // Step 3: Attempt to unfavorite (if API exists)
      console.log('\n3️⃣ Attempting to Unfavorite Neutral Messages');
      console.log('-'.repeat(50));
      
      let cleanupCount = 0;
      for (const messageId of uniqueMessageIds) {
        console.log(`\n🗑️  Attempting to unfavorite message: ${messageId}`);
        
        try {
          // Try DELETE method first
          const unfavoriteResult = await makeRequest(
            `${BASE_URL}/api/v1/messages/${messageId}/favorite`,
            YOUR_TOKEN,
            'DELETE'
          );
          
          console.log(`   Status: ${unfavoriteResult.status}`);
          
          if (unfavoriteResult.status === 200 || unfavoriteResult.status === 204) {
            console.log(`   ✅ Successfully unfavorited`);
            cleanupCount++;
          } else {
            console.log(`   ❌ Failed to unfavorite: ${unfavoriteResult.raw}`);
            
            // Try POST method to toggle
            const toggleResult = await makeRequest(
              `${BASE_URL}/api/v1/messages/${messageId}/favorite`,
              YOUR_TOKEN,
              'POST'
            );
            
            console.log(`   Trying toggle - Status: ${toggleResult.status}`);
            if (toggleResult.status === 200) {
              console.log(`   ✅ Successfully toggled favorite (unfavorited)`);
              cleanupCount++;
            }
          }
        } catch (error) {
          console.log(`   ❌ Error: ${error.message}`);
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      console.log(`\n📊 Cleanup Results: ${cleanupCount}/${uniqueMessageIds.length} messages unfavorited`);
      
      if (cleanupCount > 0) {
        console.log('\n⏳ Waiting 3 seconds for changes to take effect...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check journey stats after cleanup
        const afterJourneyResult = await makeRequest(`${BASE_URL}/api/v1/journey`, YOUR_TOKEN);
        
        if (afterJourneyResult.status === 200) {
          const afterStats = afterJourneyResult.data.data?.statistics || {};
          console.log('\n📊 Journey Stats After Cleanup:');
          console.log(`   💝 Heart-to-Hearts: ${afterStats.heartToHearts || 0}`);
          console.log(`   💡 Breakthrough Days: ${afterStats.breakthroughDays || 0}`);
          console.log(`   ⭐ Total Favorites: ${afterStats.totalFavorites || 0}`);
        }
      }
      
    } else {
      console.log('✅ No neutral messages found that need cleanup!');
      console.log('The journey categories are clean of neutral emotions.');
    }
    
    // Step 4: Database cleanup SQL (for reference)
    console.log('\n4️⃣ Database Cleanup SQL (For Admin Use)');
    console.log('-'.repeat(50));
    
    if (neutralMessagesToCleanup.length > 0) {
      const uniqueMessageIds = [...new Set(neutralMessagesToCleanup.map(m => m.id))];
      
      console.log('-- SQL to remove neutral emotion favorites:');
      console.log('DELETE FROM "UserMessageFavorite"');
      console.log('WHERE "messageId" IN (');
      uniqueMessageIds.forEach((id, index) => {
        const comma = index < uniqueMessageIds.length - 1 ? ',' : '';
        console.log(`  '${id}'${comma}`);
      });
      console.log(');');
      
      console.log('\n-- Alternative: Remove all neutral emotion favorites:');
      console.log('DELETE FROM "UserMessageFavorite"');
      console.log('WHERE "messageId" IN (');
      console.log('  SELECT id FROM "Message"');
      console.log('  WHERE emotion = \'neutral\'');
      console.log(');');
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  }
  
  console.log('\n✨ Neutral Favorites Cleanup Completed!');
  console.log('\n💡 Next Steps:');
  console.log('1. Deploy the code fix to the live server');
  console.log('2. Run database cleanup SQL if needed');
  console.log('3. Test with new neutral messages');
  console.log('4. Verify journey categories only contain emotional content');
}

// Run the cleanup
cleanupNeutralFavorites().catch(console.error);