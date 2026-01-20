const axios = require('axios');

// Test the fix locally
const BASE_URL = 'http://localhost:3400'; // Local server
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNta2pzM3FycTAwM2xwZXYwZDNxZ3VpdHoiLCJyb2xlIjoiQ0xJRU5UIiwiaWF0IjoxNzY4NzQzMzE4LCJleHAiOjE3NjkzNDgxMTh9.uF0vS7xdS7G4F3qNBgTgbYZ5apkfhPYfgtlhuLKk1KU';

async function testLocalJourneyFix() {
  console.log('🔧 Testing Local Journey Statistics Fix');
  console.log('=' .repeat(50));
  
  try {
    // Test main journey endpoint
    console.log('\n📊 Testing local journey endpoint...');
    const journeyResponse = await axios.get(`${BASE_URL}/api/v1/journey`, {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    
    if (journeyResponse.status === 200) {
      const stats = journeyResponse.data.data.statistics;
      console.log('✅ Local journey endpoint working');
      console.log(`   Heart-to-Hearts: ${stats.heartToHearts}`);
      console.log(`   Growth Moments: ${stats.growthMoments}`);
      console.log(`   Goals Achieved: ${stats.goalsAchieved}`);
      console.log(`   Breakthrough Days: ${stats.breakthroughDays}`);
      
      // Test heart-to-hearts category endpoint
      console.log('\n🔢 Testing heart-to-hearts category...');
      const heartResponse = await axios.get(`${BASE_URL}/api/v1/chats/journey/messages?category=heart-to-hearts&limit=50`, {
        headers: { 'Authorization': `Bearer ${TOKEN}` }
      });
      
      const actualCount = heartResponse.data.data.items.length;
      console.log(`   Actual heart-to-hearts count: ${actualCount}`);
      
      if (stats.heartToHearts === actualCount) {
        console.log('✅ FIX SUCCESSFUL! Statistics match actual data');
      } else {
        console.log(`❌ Fix not working: Stats show ${stats.heartToHearts}, actual is ${actualCount}`);
      }
      
    } else {
      console.log(`❌ Local server not responding: ${journeyResponse.status}`);
    }
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Local server not running');
      console.log('💡 Start local server with: npm start or node server.js');
    } else {
      console.log(`❌ Error: ${error.message}`);
    }
  }
}

testLocalJourneyFix();