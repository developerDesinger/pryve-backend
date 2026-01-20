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
          resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers });
        } catch (error) {
          resolve({ status: res.statusCode, data: null, error: error.message, headers: res.headers });
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

async function detailedServerCheck() {
  console.log('🔍 DETAILED SERVER CHECK');
  console.log('=' .repeat(50));
  console.log(`🌐 Server: ${BASE_URL}`);
  console.log(`⏰ Time: ${new Date().toISOString()}`);
  console.log('=' .repeat(50));
  
  try {
    console.log('\n📡 Making request to journey endpoint...');
    const result = await makeRequest(`${BASE_URL}/api/v1/journey`);
    
    console.log(`📊 Response Status: ${result.status}`);
    console.log(`📅 Server Date: ${result.headers.date || 'Not provided'}`);
    console.log(`🔧 Server: ${result.headers.server || 'Not provided'}`);
    
    if (result.status !== 200) {
      console.log(`❌ Request failed: ${result.status}`);
      console.log(`📋 Response: ${JSON.stringify(result.data, null, 2)}`);
      return;
    }
    
    const response = result.data;
    
    // Check response structure
    console.log('\n🔍 RESPONSE ANALYSIS:');
    console.log(`   Success: ${response.success}`);
    console.log(`   Message: ${response.message}`);
    console.log(`   Has Version: ${response.version ? 'YES' : 'NO'}`);
    
    if (response.version) {
      console.log(`   Version: ${response.version}`);
    }
    
    // Check statistics
    if (response.data && response.data.statistics) {
      const stats = response.data.statistics;
      console.log('\n📊 CURRENT STATISTICS:');
      console.log(`   Total Chats: ${stats.totalChats}`);
      console.log(`   Total Messages: ${stats.totalMessages}`);
      console.log(`   Total Favorites: ${stats.totalFavorites}`);
      console.log(`   Heart-to-Hearts: ${stats.heartToHearts} ${stats.heartToHearts === 6 ? '✅' : '❌'}`);
      console.log(`   Growth Moments: ${stats.growthMoments}`);
      console.log(`   Goals Achieved: ${stats.goalsAchieved}`);
      console.log(`   Breakthrough Days: ${stats.breakthroughDays}`);
      
      // Detailed analysis
      console.log('\n🔍 DETAILED ANALYSIS:');
      
      if (response.version && response.version.includes('JOURNEY_FIX_v2.0')) {
        console.log('✅ LATEST CODE DETECTED!');
        
        if (stats.heartToHearts === 6) {
          console.log('🎉 FIX IS WORKING PERFECTLY!');
          console.log('   Heart-to-Hearts correctly shows 6 messages');
        } else {
          console.log('⚠️  Fix deployed but not working as expected');
          console.log(`   Expected: 6, Got: ${stats.heartToHearts}`);
        }
      } else {
        console.log('❌ OLD CODE STILL RUNNING');
        console.log('   No version identifier found');
        console.log('   Heart-to-Hearts shows old value (1)');
        
        console.log('\n💡 POSSIBLE REASONS:');
        console.log('   1. Code not deployed yet');
        console.log('   2. Server not restarted');
        console.log('   3. Caching issues');
        console.log('   4. Different server instance');
      }
      
      // Compare with expected values
      console.log('\n📋 EXPECTED vs ACTUAL:');
      console.log(`   Heart-to-Hearts: Expected 6, Got ${stats.heartToHearts} ${stats.heartToHearts === 6 ? '✅' : '❌'}`);
      console.log(`   Growth Moments: Expected 6, Got ${stats.growthMoments} ${stats.growthMoments === 6 ? '✅' : '❌'}`);
      console.log(`   Goals Achieved: Expected 1, Got ${stats.goalsAchieved} ${stats.goalsAchieved === 1 ? '✅' : '❌'}`);
      console.log(`   Breakthrough Days: Expected 1, Got ${stats.breakthroughDays} ${stats.breakthroughDays === 1 ? '✅' : '❌'}`);
      
    } else {
      console.log('\n❌ No statistics found in response');
    }
    
    // Final verdict
    console.log('\n🎯 FINAL VERDICT:');
    if (response.version && response.version.includes('JOURNEY_FIX_v2.0')) {
      if (response.data.statistics.heartToHearts === 6) {
        console.log('🎉 SUCCESS: Fix deployed and working perfectly!');
      } else {
        console.log('⚠️  Fix deployed but needs debugging');
      }
    } else {
      console.log('❌ Fix NOT deployed yet');
      console.log('⏳ Please wait for deployment or check server status');
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
  
  console.log('\n✨ Detailed check completed!');
}

detailedServerCheck().catch(console.error);