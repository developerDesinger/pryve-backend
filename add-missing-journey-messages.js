const https = require('https');

// Using our existing token and chat
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNta2pzM3FycTAwM2xwZXYwZDNxZ3VpdHoiLCJyb2xlIjoiQ0xJRU5UIiwiaWF0IjoxNzY4NzQzMzE4LCJleHAiOjE3NjkzNDgxMTh9.uF0vS7xdS7G4F3qNBgTgbYZ5apkfhPYfgtlhuLKk1KU';
const BASE_URL = 'https://pryve-backend.projectco.space/api/v1';
const CHAT_ID = 'cmkjslxxl003qpev0iabetui8';

function makeRequest(url, method = 'GET', data = null) {
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
        'Authorization': `Bearer ${TOKEN}`,
        'User-Agent': 'Add-Journey-Messages/1.0'
      }
    };

    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data),
            raw: data
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: null,
            raw: data
          });
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    
    if (postData) req.write(postData);
    req.end();
  });
}

async function addMissingJourneyMessages() {
  console.log('🚀 Adding Missing Journey Messages');
  console.log('=' .repeat(60));
  
  try {
    // 1. Add Goal Achievement Messages
    console.log('\n1️⃣ Adding Goal Achievement Messages...');
    console.log('-'.repeat(40));
    
    const goalMessages = [
      {
        content: "I finally achieved my goal of running a 5K! After months of training, I completed it in under 30 minutes. This accomplishment means so much to me and I feel incredibly proud and successful.",
        description: "Running goal completion"
      },
      {
        content: "Reached a major milestone today - I finished my certification program! This goal took me 6 months to complete, but the sense of achievement is overwhelming. I feel so accomplished and ready for new challenges.",
        description: "Certification milestone"
      },
      {
        content: "Completed my savings target of $10,000! This financial goal required discipline and sacrifice, but achieving it gives me such a sense of security and success. I'm so proud of this accomplishment.",
        description: "Financial goal success"
      }
    ];
    
    const goalMessageIds = [];
    
    for (let i = 0; i < goalMessages.length; i++) {
      const msg = goalMessages[i];
      console.log(`📝 Creating: ${msg.description}`);
      
      const result = await makeRequest(`${BASE_URL}/chats/${CHAT_ID}/messages`, 'POST', {
        content: msg.content,
        type: 'text'
      });
      
      if (result.status === 200 && result.data?.data?.userMessage) {
        const messageId = result.data.data.userMessage.id;
        goalMessageIds.push(messageId);
        console.log(`✅ Created message ID: ${messageId}`);
        
        // Favorite the goal message
        const favoriteResult = await makeRequest(`${BASE_URL}/chats/${CHAT_ID}/messages/${messageId}/favorite`, 'POST');
        if (favoriteResult.status === 200) {
          console.log(`⭐ Favorited successfully`);
        }
      } else {
        console.log(`❌ Failed: ${result.raw}`);
      }
      
      // Small delay between messages
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // 2. Add Breakthrough Day Messages (need 5+ messages in one day)
    console.log('\n2️⃣ Adding Breakthrough Day Messages...');
    console.log('-'.repeat(40));
    console.log('💡 Need 5+ messages with 2+ positive emotions in one day');
    
    const breakthroughMessages = [
      "What an incredible breakthrough day! I had so many realizations and insights that will change my life. Feeling absolutely amazing and grateful!",
      "Today brought such unexpected joy and excitement - everything is falling into place perfectly. I feel so blessed and happy!",
      "Feeling overwhelmed with positive energy and love today. This day has been filled with beautiful moments and wonderful surprises!",
      "Had the most inspiring conversations today that filled me with hope and motivation. I feel so energized and ready to take on the world!",
      "This day exceeded all my expectations! So many good things happened and I feel incredibly fortunate and joyful about life."
    ];
    
    for (let i = 0; i < breakthroughMessages.length; i++) {
      const content = breakthroughMessages[i];
      console.log(`📝 Creating breakthrough message ${i + 1}/5`);
      
      const result = await makeRequest(`${BASE_URL}/chats/${CHAT_ID}/messages`, 'POST', {
        content: content,
        type: 'text'
      });
      
      if (result.status === 200) {
        console.log(`✅ Created breakthrough message ${i + 1}`);
      } else {
        console.log(`❌ Failed: ${result.raw}`);
      }
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 800));
    }
    
    // 3. Wait for emotion analysis
    console.log('\n3️⃣ Waiting for AI emotion analysis...');
    console.log('-'.repeat(40));
    console.log('⏳ Waiting 10 seconds for emotion processing...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // 4. Check updated statistics
    console.log('\n4️⃣ Checking Updated Journey Statistics...');
    console.log('-'.repeat(40));
    
    const journeyResult = await makeRequest(`${BASE_URL}/journey`);
    
    if (journeyResult.status === 200 && journeyResult.data?.data?.statistics) {
      const stats = journeyResult.data.data.statistics;
      
      console.log('\n📊 UPDATED JOURNEY STATISTICS:');
      console.log('=' .repeat(60));
      console.log(`📨 Total Messages: ${stats.totalMessages} (was 6)`);
      console.log(`⭐ Total Favorites: ${stats.totalFavorites} (was 3)`);
      console.log(`💝 Heart to Hearts: ${stats.heartToHearts} (was 1)`);
      console.log(`🌱 Growth Moments: ${stats.growthMoments} (was 3)`);
      console.log(`🎯 Goals Achieved: ${stats.goalsAchieved} (was 0) ${stats.goalsAchieved > 0 ? '✅' : '❌'}`);
      console.log(`💡 Breakthrough Days: ${stats.breakthroughDays} (was 0) ${stats.breakthroughDays > 0 ? '✅' : '❌'}`);
      console.log('=' .repeat(60));
      
      // Show improvements
      const improvements = [];
      if (stats.goalsAchieved > 0) improvements.push('🎯 Goals Achieved increased!');
      if (stats.breakthroughDays > 0) improvements.push('💡 Breakthrough Days increased!');
      if (stats.growthMoments > 3) improvements.push('🌱 Growth Moments increased!');
      if (stats.totalFavorites > 3) improvements.push('⭐ More messages favorited!');
      
      if (improvements.length > 0) {
        console.log('\n🎉 IMPROVEMENTS:');
        improvements.forEach(improvement => console.log(`   ${improvement}`));
      }
      
    } else {
      console.log('❌ Could not get updated statistics');
    }
    
    // 5. Test all journey categories
    console.log('\n5️⃣ Testing All Journey Categories...');
    console.log('-'.repeat(40));
    
    const categories = ['heart-to-hearts', 'goals-achieved', 'growth-moments', 'breakthrough-days'];
    
    for (const category of categories) {
      const categoryResult = await makeRequest(`${BASE_URL}/chats/journey/messages?category=${category}&limit=5`);
      
      if (categoryResult.status === 200 && categoryResult.data?.data?.items) {
        const count = categoryResult.data.data.items.length;
        const emoji = category === 'heart-to-hearts' ? '💝' : 
                     category === 'goals-achieved' ? '🎯' :
                     category === 'growth-moments' ? '🌱' : '💡';
        
        console.log(`${emoji} ${category}: ${count} messages ${count > 0 ? '✅' : '❌'}`);
        
        if (count > 0 && (category === 'goals-achieved' || category === 'breakthrough-days')) {
          console.log(`   🎉 SUCCESS! ${category} now has data!`);
        }
      }
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  }
  
  console.log('\n🏁 COMPLETED');
  console.log('=' .repeat(60));
  console.log('💡 Summary: Added goal achievement and breakthrough day messages');
  console.log('📊 Check the updated statistics above to see improvements!');
}

if (require.main === module) {
  addMissingJourneyMessages().catch(console.error);
}

module.exports = { addMissingJourneyMessages };