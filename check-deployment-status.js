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

async function checkDeploymentStatus() {
  console.log('🔍 CHECKING DEPLOYMENT STATUS');
  console.log('=' .repeat(50));
  console.log(`🌐 Server: ${BASE_URL}`);
  console.log('=' .repeat(50));
  
  try {
    console.log('\n📡 Making request to journey endpoint...');
    const result = await makeRequest(`${BASE_URL}/api/v1/journey`);
    
    if (result.status !== 200) {
      console.log(`❌ Request failed: ${result.status}`);
      return;
    }
    
    const response = result.data;
    
    // Check for version identifier
    console.log('\n🔍 DEPLOYMENT CHECK:');
    if (response.version) {
      console.log(`✅ VERSION FOUND: ${response.version}`);
      
      if (response.version.includes('JOURNEY_FIX_v2.0')) {
        console.log('🎉 LATEST CODE IS DEPLOYED!');
        
        // Check if the fix is working
        const stats = response.data.statistics;
        console.log('\n📊 STATISTICS CHECK:');
        console.log(`   Heart-to-Hearts: ${stats.heartToHearts}`);
        
        if (stats.heartToHearts === 6) {
          console.log('✅ FIX IS WORKING! Heart-to-Hearts shows 6 (correct)');
        } else if (stats.heartToHearts === 1) {
          console.log('❌ Fix deployed but not working (still shows 1)');
        } else {
          console.log(`❓ Unexpected value: ${stats.heartToHearts}`);
        }
        
      } else {
        console.log('⚠️  Different version deployed');
      }
    } else {
      console.log('❌ NO VERSION IDENTIFIER FOUND');
      console.log('💡 This means the latest code is NOT deployed yet');
    }
    
    // Show current statistics
    const stats = response.data.statistics;
    console.log('\n📈 CURRENT STATISTICS:');
    console.log(`   Heart-to-Hearts: ${stats.heartToHearts}`);
    console.log(`   Growth Moments: ${stats.growthMoments}`);
    console.log(`   Goals Achieved: ${stats.goalsAchieved}`);
    console.log(`   Breakthrough Days: ${stats.breakthroughDays}`);
    console.log(`   Total Favorites: ${stats.totalFavorites}`);
    
    // Final verdict
    console.log('\n🎯 VERDICT:');
    if (response.version && response.version.includes('JOURNEY_FIX_v2.0')) {
      if (stats.heartToHearts === 6) {
        console.log('🎉 SUCCESS: Latest code deployed and fix is working!');
      } else {
        console.log('⚠️  Latest code deployed but fix needs debugging');
      }
    } else {
      console.log('❌ Latest code NOT deployed yet');
      console.log('💡 Deploy the code and try again');
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
  
  console.log('\n✨ Deployment check completed!');
}

checkDeploymentStatus().catch(console.error);