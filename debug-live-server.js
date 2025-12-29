/**
 * Debug script for live server user data
 * Update the BASE_URL to match your live server
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');

// Live user token from the logs
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtamsxcWUxZzAwMDBwZWN1aTR2c2U3dGQiLCJyb2xlIjoiQ0xJRU5UIiwiaWF0IjoxNzY3MDEyNTAzLCJleHAiOjE3Njc2MTczMDN9.MteQhI3sDymZLZ09TZE3a7U7Wif72B9Gbz5FymtLll0';

// Live backend URL
const LIVE_BASE_URL = 'https://pryve-backend.projectco.space/api/v1';
// Examples:
// const LIVE_BASE_URL = 'https://your-domain.com/api/v1';
// const LIVE_BASE_URL = 'http://your-server-ip:4001/api/v1';

const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};

async function debugLiveServer() {
  console.log('🔍 Debugging Live Server User Data\n');
  
  // Decode token info
  const decoded = jwt.decode(token);
  console.log('👤 User Info from Token:');
  console.log(`   User ID: ${decoded.id}`);
  console.log(`   Role: ${decoded.role}`);
  console.log(`   Expires: ${new Date(decoded.exp * 1000)}`);
  console.log(`\n🌐 Testing Server: ${LIVE_BASE_URL}`);
  
  // Test basic connectivity
  console.log('\n🧪 Testing Server Connectivity...');
  
  try {
    // Test the main journey endpoint first
    console.log('\n1️⃣ Testing /journey endpoint:');
    const journeyResponse = await axios.get(`${LIVE_BASE_URL}/journey`, { headers });
    console.log('✅ SUCCESS - Journey endpoint works');
    console.log('📊 Statistics:', JSON.stringify(journeyResponse.data.data?.statistics, null, 2));
    
    // Test the specific endpoint that's failing
    console.log('\n2️⃣ Testing /journey/messages?category=growth-moments:');
    const growthResponse = await axios.get(
      `${LIVE_BASE_URL}/journey/messages?category=growth-moments&limit=10`, 
      { headers }
    );
    console.log('✅ SUCCESS - Growth moments endpoint works');
    console.log(`📊 Items returned: ${growthResponse.data.data?.items?.length || 0}`);
    console.log('📊 Response:', JSON.stringify(growthResponse.data, null, 2));
    
    // Test all categories
    console.log('\n3️⃣ Testing All Categories:');
    const categories = ['goals-achieved', 'heart-to-hearts', 'growth-moments', 'breakthrough-days'];
    
    for (const category of categories) {
      try {
        const response = await axios.get(
          `${LIVE_BASE_URL}/journey/messages?category=${category}&limit=5`, 
          { headers }
        );
        const count = response.data.data?.items?.length || 0;
        console.log(`   📂 ${category}: ${count} items`);
      } catch (error) {
        console.log(`   📂 ${category}: ERROR - ${error.response?.data?.message || error.message}`);
      }
    }
    
    // Test both endpoint paths
    console.log('\n4️⃣ Testing Both Endpoint Paths:');
    const endpoints = [
      { name: 'Direct Route', url: `${LIVE_BASE_URL}/journey/messages?category=growth-moments&limit=10` },
      { name: 'Chat Route', url: `${LIVE_BASE_URL}/chats/journey/messages?category=growth-moments&limit=10` }
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(endpoint.url, { headers });
        console.log(`   ✅ ${endpoint.name}: ${response.data.data?.items?.length || 0} items`);
      } catch (error) {
        console.log(`   ❌ ${endpoint.name}: ${error.response?.data?.message || error.message}`);
      }
    }
    
  } catch (error) {
    console.log('❌ FAILED - Server connection error');
    console.log(`📊 Status: ${error.response?.status || 'No response'}`);
    console.log(`📊 Error: ${error.response?.data?.message || error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Connection Refused Solutions:');
      console.log('   1. Update LIVE_BASE_URL to your actual live server URL');
      console.log('   2. Make sure your live server is running');
      console.log('   3. Check if you need to use HTTPS instead of HTTP');
      console.log('   4. Verify the port number (logs show port 4001)');
    } else if (error.response?.status === 401) {
      console.log('\n💡 Authentication Error Solutions:');
      console.log('   1. Token might be expired');
      console.log('   2. Token might be for a different environment');
      console.log('   3. Server might have different JWT secret');
    }
  }
}

// Instructions for user
console.log('🚀 Live Server Debug Script');
console.log('=' .repeat(50));
console.log('📝 INSTRUCTIONS:');
console.log('1. Update LIVE_BASE_URL in this script to match your live server');
console.log('2. Make sure your live server is running and accessible');
console.log('3. Run this script to debug the live user data');
console.log('=' .repeat(50));

// Run the debug
if (require.main === module) {
  debugLiveServer().catch(console.error);
}

module.exports = { debugLiveServer };