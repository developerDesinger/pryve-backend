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

async function main() {
  console.log('🔍 SIMPLE JOURNEY STATISTICS CHECK');
  console.log('=' .repeat(50));
  
  try {
    // 1. Get main journey stats
    console.log('\n📊 Getting main journey statistics...');
    const journeyResult = await makeRequest(`${BASE_URL}/api/v1/journey`);
    
    if (journeyResult.status !== 200) {
      console.log(`❌ Journey endpoint failed: ${journeyResult.status}`);
      return;
    }
    
    const stats = journeyResult.data.data.statistics;
    console.log('✅ Journey endpoint working');
    
    // 2. Get actual counts from category endpoints
    console.log('\n🔢 Counting actual items in each category...');
    
    const categories = [
      'heart-to-hearts',
      'goals-achieved', 
      'growth-moments',
      'breakthrough-days'
    ];
    
    const actualCounts = {};
    
    for (const category of categories) {
      const result = await makeRequest(`${BASE_URL}/api/v1/chats/journey/messages?category=${category}&limit=100`);
      const count = result.data?.data?.items?.length || 0;
      actualCounts[category] = count;
      console.log(`   ${category}: ${count} items`);
    }
    
    // 3. Compare stats vs actual
    console.log('\n📋 COMPARISON RESULTS:');
    console.log('=' .repeat(50));
    
    const comparisons = [
      { name: 'Heart-to-Hearts', statKey: 'heartToHearts', actualKey: 'heart-to-hearts' },
      { name: 'Goals Achieved', statKey: 'goalsAchieved', actualKey: 'goals-achieved' },
      { name: 'Growth Moments', statKey: 'growthMoments', actualKey: 'growth-moments' },
      { name: 'Breakthrough Days', statKey: 'breakthroughDays', actualKey: 'breakthrough-days' }
    ];
    
    let issuesFound = 0;
    
    comparisons.forEach(comp => {
      const statValue = stats[comp.statKey] || 0;
      const actualValue = actualCounts[comp.actualKey] || 0;
      const match = statValue === actualValue;
      
      console.log(`\n${comp.name}:`);
      console.log(`   Stats show: ${statValue}`);
      console.log(`   Actual count: ${actualValue}`);
      console.log(`   Status: ${match ? '✅ CORRECT' : '❌ MISMATCH'}`);
      
      if (!match) {
        issuesFound++;
        console.log(`   🔧 Fix needed: Update stats to show ${actualValue}`);
      }
    });
    
    // 4. Summary
    console.log('\n🎯 SUMMARY:');
    console.log('=' .repeat(50));
    
    if (issuesFound === 0) {
      console.log('✅ All statistics are correct!');
    } else {
      console.log(`❌ Found ${issuesFound} statistics issues`);
      console.log('\n💡 ISSUES TO FIX:');
      
      comparisons.forEach(comp => {
        const statValue = stats[comp.statKey] || 0;
        const actualValue = actualCounts[comp.actualKey] || 0;
        if (statValue !== actualValue) {
          console.log(`   - ${comp.name}: Change ${statValue} → ${actualValue}`);
        }
      });
      
      console.log('\n🔧 ACTION NEEDED:');
      console.log('   1. Fix statistics calculation in journey service');
      console.log('   2. Ensure all categories count individual messages');
      console.log('   3. Update statistics when data changes');
    }
    
    // 5. Basic stats check
    console.log('\n📈 BASIC STATS CHECK:');
    console.log(`   Total Chats: ${stats.totalChats}`);
    console.log(`   Total Messages: ${stats.totalMessages}`);
    console.log(`   Total Favorites: ${stats.totalFavorites}`);
    
    const totalJourneyItems = Object.values(actualCounts).reduce((sum, count) => sum + count, 0);
    console.log(`   Total Journey Items: ${totalJourneyItems}`);
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
  }
  
  console.log('\n✨ Check completed!');
}

main().catch(console.error);