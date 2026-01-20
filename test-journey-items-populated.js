const https = require('https');

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
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    req.end();
  });
}

async function testJourneyItemsPopulated() {
  console.log('🔍 TESTING JOURNEY ITEMS POPULATION');
  console.log('=' .repeat(50));
  console.log(`🌐 Server: ${BASE_URL}`);
  console.log('=' .repeat(50));
  
  try {
    console.log('\n📡 Getting journey data...');
    const result = await makeRequest(`${BASE_URL}/api/v1/journey`);
    
    if (result.status !== 200) {
      console.log(`❌ Request failed: ${result.status}`);
      return;
    }
    
    const response = result.data;
    const journeyOverview = response.data.journeyOverview;
    
    console.log('✅ Journey endpoint working');
    console.log(`📋 Version: ${response.version || 'Not found'}`);
    
    // Test Heart-to-Hearts
    console.log('\n💝 HEART-TO-HEARTS CHECK:');
    console.log('=' .repeat(30));
    const heartToHearts = journeyOverview.heartToHearts;
    console.log(`   Count: ${heartToHearts.count}`);
    console.log(`   Items Array Length: ${heartToHearts.items.length}`);
    
    if (heartToHearts.items.length > 0) {
      console.log('✅ Heart-to-Hearts items are populated!');
      console.log('\n📋 Sample Heart-to-Hearts Items:');
      heartToHearts.items.slice(0, 3).forEach((item, index) => {
        console.log(`   ${index + 1}. Chat: ${item.chatName}`);
        console.log(`      Type: ${item.chatType}`);
        console.log(`      Messages: ${item.emotionalMessageCount}`);
        console.log(`      Updated: ${new Date(item.lastUpdatedAt).toLocaleDateString()}`);
      });
    } else {
      console.log('❌ Heart-to-Hearts items array is still empty');
    }
    
    // Test Growth Moments
    console.log('\n🌱 GROWTH MOMENTS CHECK:');
    console.log('=' .repeat(30));
    const growthMoments = journeyOverview.growthMoments;
    console.log(`   Count: ${growthMoments.count}`);
    console.log(`   Items Array Length: ${growthMoments.items.length}`);
    
    if (growthMoments.items.length > 0) {
      console.log('✅ Growth Moments items are populated!');
      console.log('\n📋 Sample Growth Moments Items:');
      growthMoments.items.slice(0, 3).forEach((item, index) => {
        console.log(`   ${index + 1}. Content: ${item.content?.substring(0, 50)}...`);
        console.log(`      Emotion: ${item.emotion} (${item.emotionConfidence})`);
        console.log(`      Chat: ${item.chat?.name}`);
        console.log(`      Date: ${new Date(item.createdAt).toLocaleDateString()}`);
      });
    } else {
      console.log('❌ Growth Moments items array is still empty');
    }
    
    // Summary
    console.log('\n🎯 SUMMARY:');
    console.log('=' .repeat(30));
    
    const heartItemsOk = heartToHearts.items.length > 0;
    const growthItemsOk = growthMoments.items.length > 0;
    const countsCorrect = heartToHearts.count === 6 && growthMoments.count === 6;
    
    console.log(`   Heart-to-Hearts Count: ${heartToHearts.count} ${heartToHearts.count === 6 ? '✅' : '❌'}`);
    console.log(`   Heart-to-Hearts Items: ${heartToHearts.items.length} ${heartItemsOk ? '✅' : '❌'}`);
    console.log(`   Growth Moments Count: ${growthMoments.count} ${growthMoments.count === 6 ? '✅' : '❌'}`);
    console.log(`   Growth Moments Items: ${growthMoments.items.length} ${growthItemsOk ? '✅' : '❌'}`);
    
    if (countsCorrect && heartItemsOk && growthItemsOk) {
      console.log('\n🎉 PERFECT! All counts are correct and items arrays are populated!');
    } else if (countsCorrect) {
      console.log('\n⚠️  Counts are correct but items arrays need fixing');
    } else {
      console.log('\n❌ Issues found with counts or items');
    }
    
    // Show other stats
    console.log('\n📊 OTHER STATISTICS:');
    const stats = response.data.statistics;
    console.log(`   Goals Achieved: ${stats.goalsAchieved}`);
    console.log(`   Breakthrough Days: ${stats.breakthroughDays}`);
    console.log(`   Total Favorites: ${stats.totalFavorites}`);
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
  
  console.log('\n✨ Items population test completed!');
}

testJourneyItemsPopulated().catch(console.error);