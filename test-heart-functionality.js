const https = require('https');

// Using the token we generated
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
        'User-Agent': 'Heart-Functionality-Test/1.0'
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

async function testHeartFunctionality() {
  console.log('❤️  Testing Heart Functionality (Heart-to-Hearts)');
  console.log('=' .repeat(70));
  console.log(`🔑 Token: ${TOKEN.substring(0, 20)}...${TOKEN.substring(TOKEN.length - 10)}`);
  console.log('=' .repeat(70));
  
  try {
    // 1. Test Journey Overview (contains heart-to-hearts statistics)
    console.log('\n1️⃣ Testing Journey Overview (Heart-to-Hearts Statistics)');
    console.log('-'.repeat(60));
    
    const journeyUrl = `${BASE_URL}/journey`;
    console.log(`🔗 URL: ${journeyUrl}`);
    
    const journeyResult = await makeRequest(journeyUrl);
    
    console.log(`📊 Status: ${journeyResult.status}`);
    
    if (journeyResult.status === 200) {
      console.log('✅ SUCCESS!');
      console.log('📄 Journey Response:');
      console.log(JSON.stringify(journeyResult.data, null, 2));
      
      // Extract heart-to-hearts statistics
      const stats = journeyResult.data.data?.statistics;
      if (stats) {
        console.log('\n💖 HEART-TO-HEARTS STATISTICS:');
        console.log(`   Count: ${stats.heartToHearts || 0}`);
        console.log(`   Total Messages: ${stats.totalMessages || 0}`);
        console.log(`   Total Favorites: ${stats.totalFavorites || 0}`);
      }
      
      // Check if there's heart-to-hearts overview data
      const overview = journeyResult.data.data?.journeyOverview;
      if (overview?.heartToHearts) {
        console.log('\n💝 HEART-TO-HEARTS OVERVIEW:');
        console.log(`   Count: ${overview.heartToHearts.count || 0}`);
        console.log(`   Items: ${overview.heartToHearts.items?.length || 0}`);
        
        if (overview.heartToHearts.items?.length > 0) {
          console.log('\n📋 Heart-to-Hearts Items:');
          overview.heartToHearts.items.forEach((item, index) => {
            console.log(`   ${index + 1}. Chat ID: ${item.id}`);
            console.log(`      Title: ${item.title || 'No title'}`);
            console.log(`      Messages: ${item.messageCount || 0}`);
            console.log(`      Updated: ${item.updatedAt}`);
          });
        }
      }
    } else {
      console.log(`❌ Failed: ${journeyResult.raw}`);
    }
    
    // 2. Test Heart-to-Hearts Messages Endpoint
    console.log('\n2️⃣ Testing Heart-to-Hearts Messages Endpoint');
    console.log('-'.repeat(60));
    
    const heartMessagesUrl = `${BASE_URL}/chats/journey/messages?category=heart-to-hearts&limit=10`;
    console.log(`🔗 URL: ${heartMessagesUrl}`);
    
    const heartMessagesResult = await makeRequest(heartMessagesUrl);
    
    console.log(`📊 Status: ${heartMessagesResult.status}`);
    
    if (heartMessagesResult.status === 200) {
      console.log('✅ SUCCESS!');
      console.log('📄 Heart-to-Hearts Messages Response:');
      console.log(JSON.stringify(heartMessagesResult.data, null, 2));
      
      const items = heartMessagesResult.data.data?.items || [];
      console.log(`\n💌 Found ${items.length} heart-to-hearts messages`);
      
      if (items.length > 0) {
        console.log('\n📋 Heart-to-Hearts Messages:');
        items.forEach((item, index) => {
          console.log(`\n${index + 1}. Message ID: ${item.id}`);
          console.log(`   Title: ${item.title || 'No title'}`);
          console.log(`   Content: ${item.content?.substring(0, 100) || 'No content'}...`);
          console.log(`   Created: ${item.createdAt}`);
          console.log(`   Is Favorite: ${item.isFavorite}`);
          if (item.emotion) {
            console.log(`   Emotion: ${item.emotion.label} (${item.emotion.confidence})`);
          }
        });
      } else {
        console.log('💡 No heart-to-hearts messages found. This could mean:');
        console.log('   - User has no messages with heart-to-hearts emotions');
        console.log('   - Messages exist but are not favorited');
        console.log('   - Messages need emotion analysis');
      }
    } else {
      console.log(`❌ Failed: ${heartMessagesResult.raw}`);
    }
    
    // 3. Test Alternative Journey Messages Route
    console.log('\n3️⃣ Testing Alternative Journey Messages Route');
    console.log('-'.repeat(60));
    
    const altHeartUrl = `${BASE_URL}/journey/messages?category=heart-to-hearts&limit=10`;
    console.log(`🔗 URL: ${altHeartUrl}`);
    
    const altHeartResult = await makeRequest(altHeartUrl);
    
    console.log(`📊 Status: ${altHeartResult.status}`);
    
    if (altHeartResult.status === 200) {
      console.log('✅ SUCCESS!');
      console.log('📄 Alternative Route Response:');
      console.log(JSON.stringify(altHeartResult.data, null, 2));
    } else {
      console.log(`❌ Failed: ${altHeartResult.raw}`);
    }
    
    // 4. Test All Journey Categories (including heart-to-hearts)
    console.log('\n4️⃣ Testing All Journey Categories');
    console.log('-'.repeat(60));
    
    const categories = ['heart-to-hearts', 'goals-achieved', 'growth-moments', 'breakthrough-days'];
    
    for (const category of categories) {
      console.log(`\n📂 Testing category: ${category}`);
      
      const categoryUrl = `${BASE_URL}/chats/journey/messages?category=${category}&limit=5`;
      const categoryResult = await makeRequest(categoryUrl);
      
      console.log(`   📊 Status: ${categoryResult.status}`);
      
      if (categoryResult.status === 200) {
        const items = categoryResult.data.data?.items || [];
        console.log(`   ✅ SUCCESS: ${items.length} items found`);
        
        if (category === 'heart-to-hearts' && items.length > 0) {
          console.log('   💖 Heart-to-Hearts sample:');
          items.slice(0, 2).forEach((item, index) => {
            console.log(`      ${index + 1}. ${item.title || item.content?.substring(0, 50) || 'No content'}...`);
          });
        }
      } else {
        console.log(`   ❌ Failed: ${categoryResult.status}`);
      }
    }
    
    // 5. Summary
    console.log('\n📋 HEART FUNCTIONALITY SUMMARY');
    console.log('=' .repeat(70));
    console.log('💖 Heart functionality is implemented as "heart-to-hearts" category');
    console.log('🔗 Available endpoints:');
    console.log('   1. /journey - Contains heart-to-hearts statistics and overview');
    console.log('   2. /chats/journey/messages?category=heart-to-hearts - Heart-to-hearts messages');
    console.log('   3. /journey/messages?category=heart-to-hearts - Alternative route (if available)');
    console.log('');
    console.log('📊 Heart-to-hearts represents:');
    console.log('   - Emotional conversations and deep connections');
    console.log('   - Messages with emotions like love, connection, vulnerability');
    console.log('   - Favorited messages that show meaningful interactions');
    console.log('');
    console.log('💡 To see heart-to-hearts data, users need:');
    console.log('   - Messages with emotional analysis');
    console.log('   - Messages marked as favorites');
    console.log('   - Conversations with deep emotional content');
    
  } catch (error) {
    console.error('❌ Error testing heart functionality:', error.message);
  }
}

if (require.main === module) {
  testHeartFunctionality().catch(console.error);
}

module.exports = { testHeartFunctionality };