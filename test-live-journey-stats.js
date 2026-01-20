const https = require('https');

// Working token from previous test
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNta2pzM3FycTAwM2xwZXYwZDNxZ3VpdHoiLCJyb2xlIjoiQ0xJRU5UIiwiaWF0IjoxNzY4NzQzMzE4LCJleHAiOjE3NjkzNDgxMTh9.uF0vS7xdS7G4F3qNBgTgbYZ5apkfhPYfgtlhuLKk1KU';

const BASE_URL = 'https://pryve-backend.projectco.space';

function makeRequest(url, token) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Journey-Stats-Test/1.0'
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
    
    req.end();
  });
}

async function testJourneyMainEndpoint() {
  console.log('🚀 Testing Live Journey Main Endpoint');
  console.log('=' .repeat(60));
  console.log(`🌐 Server: ${BASE_URL}`);
  console.log(`🔑 Token: ${TOKEN.substring(0, 20)}...${TOKEN.substring(TOKEN.length - 10)}`);
  console.log('=' .repeat(60));
  
  try {
    const endpoint = `${BASE_URL}/api/v1/journey`;
    console.log(`\n🎯 Testing Main Journey Endpoint:`);
    console.log(`🔗 ${endpoint}`);
    
    const result = await makeRequest(endpoint, TOKEN);
    
    console.log(`\n📊 Response Status: ${result.status}`);
    
    if (result.status === 200) {
      console.log('✅ SUCCESS! Journey endpoint is working!');
      
      const responseData = result.data;
      console.log(`\n📋 Response Structure:`);
      console.log(`   Success: ${responseData.success}`);
      
      if (responseData.data) {
        const data = responseData.data;
        
        // Check statistics
        if (data.statistics) {
          console.log(`\n📊 JOURNEY STATISTICS:`);
          console.log('=' .repeat(40));
          const stats = data.statistics;
          
          console.log(`   📈 Total Chats: ${stats.totalChats || 0}`);
          console.log(`   💬 Total Messages: ${stats.totalMessages || 0}`);
          console.log(`   ⭐ Total Favorites: ${stats.totalFavorites || 0}`);
          console.log(`   🎯 Goals Achieved: ${stats.goalsAchieved || 0}`);
          console.log(`   💝 Heart to Hearts: ${stats.heartToHearts || 0}`);
          console.log(`   🌱 Growth Moments: ${stats.growthMoments || 0}`);
          console.log(`   💡 Breakthrough Days: ${stats.breakthroughDays || 0}`);
          
          // Check if stats are updating
          console.log(`\n🔍 STATISTICS ANALYSIS:`);
          const hasData = stats.totalMessages > 0 || stats.totalFavorites > 0;
          const hasJourneyData = stats.heartToHearts > 0 || stats.growthMoments > 0 || stats.goalsAchieved > 0 || stats.breakthroughDays > 0;
          
          if (hasData) {
            console.log(`   ✅ User has basic data (${stats.totalMessages} messages, ${stats.totalFavorites} favorites)`);
          } else {
            console.log(`   ⚠️  No basic data found`);
          }
          
          if (hasJourneyData) {
            console.log(`   ✅ Journey categories have data`);
          } else {
            console.log(`   ❌ Journey categories are empty (stats not updating)`);
          }
          
          // Compare with actual heart-to-hearts data we found earlier
          console.log(`\n🔄 COMPARISON WITH ACTUAL DATA:`);
          console.log(`   Heart-to-Hearts in stats: ${stats.heartToHearts}`);
          console.log(`   Heart-to-Hearts found in endpoint: 6 (from previous test)`);
          
          if (stats.heartToHearts !== 6) {
            console.log(`   ❌ MISMATCH! Stats show ${stats.heartToHearts} but endpoint returns 6`);
            console.log(`   💡 This indicates the statistics are not updating correctly`);
          } else {
            console.log(`   ✅ Statistics match the actual data`);
          }
          
        } else {
          console.log(`\n❌ No statistics found in response`);
        }
        
        // Check other data sections
        if (data.recentActivity) {
          console.log(`\n📅 Recent Activity: ${data.recentActivity.length || 0} items`);
        }
        
        if (data.insights) {
          console.log(`\n💡 Insights: ${data.insights.length || 0} items`);
        }
        
        if (data.milestones) {
          console.log(`\n🏆 Milestones: ${data.milestones.length || 0} items`);
        }
        
      } else {
        console.log(`\n❌ No data section in response`);
      }
      
      console.log(`\n📋 Full JSON Response:`);
      console.log(JSON.stringify(responseData, null, 2));
      
    } else if (result.status === 401) {
      console.log('❌ UNAUTHORIZED - Token expired or invalid');
    } else if (result.status === 404) {
      console.log('❌ NOT FOUND - Journey endpoint doesn\'t exist');
    } else {
      console.log(`❌ FAILED with status ${result.status}`);
      console.log(`📊 Response: ${result.raw}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

async function testAllJourneyCategories() {
  console.log('\n🔍 Testing All Journey Categories for Comparison');
  console.log('=' .repeat(60));
  
  const categories = [
    'heart-to-hearts',
    'goals-achieved', 
    'growth-moments',
    'breakthrough-days'
  ];
  
  const categoryResults = {};
  
  for (const category of categories) {
    try {
      const endpoint = `${BASE_URL}/api/v1/chats/journey/messages?category=${category}&limit=50`;
      console.log(`\n📂 Testing: ${category}`);
      console.log(`🔗 ${endpoint}`);
      
      const result = await makeRequest(endpoint, TOKEN);
      const items = result.data?.data?.items || [];
      
      categoryResults[category] = items.length;
      console.log(`   Status: ${result.status} | Items: ${items.length}`);
      
      if (items.length > 0) {
        console.log(`   ✅ Found ${items.length} ${category} messages`);
        
        // Show sample titles
        const sampleTitles = items.slice(0, 2).map(item => 
          item.title?.substring(0, 50) + '...' || 'No title'
        );
        console.log(`   📝 Samples: ${sampleTitles.join(' | ')}`);
      } else {
        console.log(`   ⚠️  No ${category} messages found`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error testing ${category}: ${error.message}`);
      categoryResults[category] = 0;
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return categoryResults;
}

async function main() {
  // Test main journey endpoint
  await testJourneyMainEndpoint();
  
  // Test individual categories
  const categoryResults = await testAllJourneyCategories();
  
  // Final analysis
  console.log('\n🎯 FINAL ANALYSIS');
  console.log('=' .repeat(60));
  
  console.log('\n📊 Actual Data Found:');
  Object.entries(categoryResults).forEach(([category, count]) => {
    console.log(`   ${category}: ${count} items`);
  });
  
  const totalJourneyItems = Object.values(categoryResults).reduce((sum, count) => sum + count, 0);
  console.log(`\n📈 Total Journey Items: ${totalJourneyItems}`);
  
  if (totalJourneyItems > 0) {
    console.log('\n✅ CONCLUSION: Journey endpoints are working and returning data');
    console.log('❓ ISSUE: If main journey statistics show 0, then stats are not updating correctly');
    console.log('\n💡 RECOMMENDATION:');
    console.log('   1. Check the statistics calculation logic in the journey service');
    console.log('   2. Verify database queries for counting journey items');
    console.log('   3. Ensure statistics are refreshed when new data is added');
  } else {
    console.log('\n⚠️  CONCLUSION: No journey data found in any category');
    console.log('💡 This could indicate a data processing issue');
  }
  
  console.log('\n✨ Journey statistics test completed!');
}

// Run the test
main().catch(console.error);