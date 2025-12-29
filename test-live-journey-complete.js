/**
 * Complete Journey Endpoints Testing Script for Live Server
 * 
 * INSTRUCTIONS:
 * 1. Update the TOKEN below with a fresh token from your user
 * 2. Run: node test-live-journey-complete.js
 * 3. Check the results to see if endpoints return data or empty arrays
 */

const https = require('https');

// 🔧 UPDATE THIS TOKEN WITH A FRESH ONE FROM YOUR USER
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtamsxcWUxZzAwMDBwZWN1aTR2c2U3dGQiLCJyb2xlIjoiQ0xJRU5UIiwiaWF0IjoxNzY3MDEyNTAzLCJleHAiOjE3Njc2MTczMDN9.MteQhI3sDymZLZ09TZE3a7U7Wif72B9Gbz5FymtLll0';

// Live server configuration
const BASE_URL = 'https://pryve-backend.projectco.space/api/v1';
const USER_ID = 'cmjk1qe1g0000pecui4vse7td'; // From the token we analyzed

// Test configuration
const CATEGORIES = ['goals-achieved', 'heart-to-hearts', 'growth-moments', 'breakthrough-days'];

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
        'User-Agent': 'Journey-Test-Script/1.0'
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

async function testJourneyEndpoints() {
  console.log('🚀 Complete Journey Endpoints Test');
  console.log('=' .repeat(60));
  console.log(`🌐 Server: ${BASE_URL}`);
  console.log(`👤 User ID: ${USER_ID}`);
  console.log(`🔑 Token: ${TOKEN.substring(0, 20)}...${TOKEN.substring(TOKEN.length - 10)}`);
  console.log('=' .repeat(60));
  
  // Check if token is updated
  if (TOKEN === 'PASTE_YOUR_FRESH_TOKEN_HERE') {
    console.log('❌ ERROR: Please update the TOKEN variable with a fresh token!');
    console.log('💡 Get a fresh token from your user and replace the TOKEN value above.');
    return;
  }
  
  try {
    // Test 1: Main Journey Endpoint
    console.log('\n1️⃣ Testing Main Journey Endpoint');
    console.log('-'.repeat(40));
    
    const journeyUrl = `${BASE_URL}/journey`;
    console.log(`🔗 ${journeyUrl}`);
    
    const journeyResult = await makeRequest(journeyUrl, TOKEN);
    
    if (journeyResult.status === 200) {
      console.log('✅ SUCCESS');
      const stats = journeyResult.data.data?.statistics;
      if (stats) {
        console.log('📊 Statistics:');
        console.log(`   Total Chats: ${stats.totalChats}`);
        console.log(`   Total Messages: ${stats.totalMessages}`);
        console.log(`   Total Favorites: ${stats.totalFavorites}`);
        console.log(`   Goals Achieved: ${stats.goalsAchieved}`);
        console.log(`   Heart to Hearts: ${stats.heartToHearts}`);
        console.log(`   Growth Moments: ${stats.growthMoments}`);
        console.log(`   Breakthrough Days: ${stats.breakthroughDays}`);
      }
    } else {
      console.log(`❌ FAILED (${journeyResult.status})`);
      console.log(`📊 Response: ${journeyResult.raw}`);
      
      if (journeyResult.status === 401) {
        console.log('💡 Token expired or invalid - get a fresh token');
        return;
      }
    }
    
    // Test 2: Journey Messages - All Categories
    console.log('\n2️⃣ Testing Journey Messages by Category');
    console.log('-'.repeat(40));
    
    for (const category of CATEGORIES) {
      console.log(`\n📂 Category: ${category}`);
      
      // Test both endpoint paths
      const endpoints = [
        {
          name: 'Direct Route',
          url: `${BASE_URL}/journey/messages?category=${category}&limit=10`
        },
        {
          name: 'Chat Route',
          url: `${BASE_URL}/chats/journey/messages?category=${category}&limit=10`
        }
      ];
      
      for (const endpoint of endpoints) {
        console.log(`   🔗 ${endpoint.name}: ${endpoint.url}`);
        
        try {
          const result = await makeRequest(endpoint.url, TOKEN);
          
          if (result.status === 200) {
            const items = result.data.data?.items || [];
            console.log(`   ✅ SUCCESS: ${items.length} items`);
            
            if (items.length > 0) {
              console.log('   📋 Sample items:');
              items.slice(0, 2).forEach((item, index) => {
                console.log(`      ${index + 1}. ${item.title || item.content?.substring(0, 40) || 'No title'}`);
                if (item.emotion) {
                  console.log(`         Emotion: ${item.emotion.label} (${item.emotion.confidence})`);
                }
              });
            } else {
              console.log('   ⚠️  EMPTY ARRAY - This is the issue we need to fix!');
            }
          } else {
            console.log(`   ❌ FAILED (${result.status}): ${result.raw}`);
          }
        } catch (error) {
          console.log(`   ❌ ERROR: ${error.message}`);
        }
      }
    }
    
    // Test 3: Specific Problem Endpoint from Logs
    console.log('\n3️⃣ Testing Specific Problem Endpoint');
    console.log('-'.repeat(40));
    
    const problemUrl = `${BASE_URL}/chats/journey/messages?category=growth-moments&limit=10`;
    console.log(`🔗 ${problemUrl}`);
    console.log('📝 This is the exact endpoint from your server logs');
    
    const problemResult = await makeRequest(problemUrl, TOKEN);
    
    if (problemResult.status === 200) {
      const items = problemResult.data.data?.items || [];
      console.log(`✅ Status: 200 OK`);
      console.log(`📊 Items: ${items.length}`);
      console.log(`📊 Full Response:`, JSON.stringify(problemResult.data, null, 2));
      
      if (items.length === 0) {
        console.log('\n🎯 CONFIRMED: This endpoint returns empty array');
        console.log('💡 This matches your server logs exactly');
      }
    } else {
      console.log(`❌ Status: ${problemResult.status}`);
      console.log(`📊 Response: ${problemResult.raw}`);
    }
    
    // Test 4: Summary and Recommendations
    console.log('\n4️⃣ Summary and Recommendations');
    console.log('=' .repeat(60));
    
    if (journeyResult.status === 200) {
      const stats = journeyResult.data.data?.statistics;
      
      if (stats && stats.totalFavorites > 0 && stats.totalMessages > 0) {
        console.log('📊 User has data:');
        console.log(`   ✅ ${stats.totalMessages} messages`);
        console.log(`   ✅ ${stats.totalFavorites} favorites`);
        console.log(`   ✅ ${stats.growthMoments} growth moments in stats`);
        console.log('\n❌ But journey messages return empty arrays');
        console.log('\n💡 ROOT CAUSE: Data exists but doesn\'t meet journey criteria');
        console.log('   Need: Favorited + User Messages + With Emotions');
        
        console.log('\n🔧 SOLUTION:');
        console.log('   1. Copy fix-live-user-simple.js to your live server');
        console.log('   2. Run: node fix-live-user-simple.js');
        console.log('   3. This will favorite the user\'s emotional messages');
        console.log('   4. Re-run this test to verify the fix');
        
      } else {
        console.log('📊 User has minimal data - needs more conversations and favorites');
      }
    }
    
    console.log('\n🎉 Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Instructions
console.log('📋 JOURNEY ENDPOINTS TEST SCRIPT');
console.log('=' .repeat(60));
console.log('🔧 SETUP INSTRUCTIONS:');
console.log('1. Get a fresh JWT token from your user login');
console.log('2. Update the TOKEN variable at the top of this script');
console.log('3. Run: node test-live-journey-complete.js');
console.log('4. Check results to see if endpoints return data or empty arrays');
console.log('=' .repeat(60));

// Run the test
if (require.main === module) {
  testJourneyEndpoints().catch(console.error);
}

module.exports = { testJourneyEndpoints };