const https = require('https');

// Working token
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNta2pzM3FycTAwM2xwZXYwZDNxZ3VpdHoiLCJyb2xlIjoiQ0xJRU5UIiwiaWF0IjoxNzY4NzQzMzE4LCJleHAiOjE3NjkzNDgxMTh9.uF0vS7xdS7G4F3qNBgTgbYZ5apkfhPYfgtlhuLKk1KU';
const BASE_URL = 'https://pryve-backend.projectco.space';

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (error) {
          resolve({ status: res.statusCode, data: null, error: error.message });
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    req.end();
  });
}

async function testLiveServerFix() {
  console.log('🚀 TESTING LIVE SERVER JOURNEY FIX');
  console.log('=' .repeat(50));
  console.log(`🌐 Server: ${BASE_URL}`);
  console.log(`🔑 Token: ${TOKEN.substring(0, 20)}...`);
  console.log('=' .repeat(50));
  
  try {
    // 1. Get main journey statistics
    console.log('\n📊 Step 1: Getting journey statistics...');
    const journeyResult = await makeRequest(`${BASE_URL}/api/v1/journey`);
    
    if (journeyResult.status !== 200) {
      console.log(`❌ Journey endpoint failed: ${journeyResult.status}`);
      return;
    }
    
    const stats = journeyResult.data.data.statistics;
    console.log('✅ Journey endpoint working');
    
    // 2. Get actual heart-to-hearts count
    console.log('\n🔢 Step 2: Counting actual heart-to-hearts...');
    const heartResult = await makeRequest(`${BASE_URL}/api/v1/chats/journey/messages?category=heart-to-hearts&limit=100`);
    const actualHeartCount = heartResult.data?.data?.items?.length || 0;
    
    console.log(`   Actual heart-to-hearts messages: ${actualHeartCount}`);
    
    // 3. Compare and verify fix
    console.log('\n🎯 Step 3: Verifying the fix...');
    console.log('=' .repeat(30));
    
    console.log(`📊 Statistics show: ${stats.heartToHearts}`);
    console.log(`🔢 Actual count: ${actualHeartCount}`);
    
    if (stats.heartToHearts === actualHeartCount) {
      console.log('✅ SUCCESS! Heart-to-Hearts statistics are now CORRECT!');
      console.log('🎉 The fix has been successfully deployed to live server');
      
      // Test all other categories too
      console.log('\n🔍 Step 4: Verifying all categories...');
      const categories = [
        { name: 'Goals Achieved', statKey: 'goalsAchieved', endpoint: 'goals-achieved' },
        { name: 'Growth Moments', statKey: 'growthMoments', endpoint: 'growth-moments' },
        { name: 'Breakthrough Days', statKey: 'breakthroughDays', endpoint: 'breakthrough-days' }
      ];
      
      let allCorrect = true;
      
      for (const cat of categories) {
        const result = await makeRequest(`${BASE_URL}/api/v1/chats/journey/messages?category=${cat.endpoint}&limit=100`);
        const actualCount = result.data?.data?.items?.length || 0;
        const statValue = stats[cat.statKey] || 0;
        const match = statValue === actualCount;
        
        console.log(`   ${cat.name}: ${statValue} = ${actualCount} ${match ? '✅' : '❌'}`);
        if (!match) allCorrect = false;
      }
      
      if (allCorrect) {
        console.log('\n🎉 PERFECT! All journey statistics are now correct!');
      } else {
        console.log('\n⚠️  Some other categories still have issues');
      }
      
    } else {
      console.log('❌ ISSUE STILL EXISTS');
      console.log(`   Expected: ${actualHeartCount}`);
      console.log(`   Got: ${stats.heartToHearts}`);
      console.log('💡 The fix may not be deployed yet or needs additional changes');
      
      // Show what the fix should be
      console.log('\n🔧 DEPLOYMENT STATUS:');
      if (stats.heartToHearts === 6) {
        console.log('✅ Fix appears to be deployed (showing 6)');
      } else if (stats.heartToHearts === 1) {
        console.log('❌ Fix not deployed yet (still showing 1)');
      } else {
        console.log(`❓ Unexpected value: ${stats.heartToHearts}`);
      }
    }
    
    // 4. Show current statistics summary
    console.log('\n📈 CURRENT LIVE SERVER STATISTICS:');
    console.log('=' .repeat(40));
    console.log(`   Total Chats: ${stats.totalChats}`);
    console.log(`   Total Messages: ${stats.totalMessages}`);
    console.log(`   Total Favorites: ${stats.totalFavorites}`);
    console.log(`   Heart-to-Hearts: ${stats.heartToHearts}`);
    console.log(`   Growth Moments: ${stats.growthMoments}`);
    console.log(`   Goals Achieved: ${stats.goalsAchieved}`);
    console.log(`   Breakthrough Days: ${stats.breakthroughDays}`);
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
  }
  
  console.log('\n✨ Live server test completed!');
}

testLiveServerFix().catch(console.error);