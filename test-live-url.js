/**
 * Simple test to check live URL accessibility
 */

const axios = require('axios');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtamsxcWUxZzAwMDBwZWN1aTR2c2U3dGQiLCJyb2xlIjoiQ0xJRU5UIiwiaWF0IjoxNzY3MDEyNTAzLCJleHAiOjE3Njc2MTQxMjF9.MteQhI3sDymZLZ09TZE3a7U7Wif72B9Gbz5FymtLll0';

const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};

async function testLiveUrl() {
  console.log('🧪 Testing Live Backend URL\n');
  
  // Try different URL formats
  const urlsToTry = [
    'https://pryve-backend.projectco.space/api/v1/journey',
    'http://pryve-backend.projectco.space/api/v1/journey',
    'https://pryve-backend.projectco.space:443/api/v1/journey',
    'https://pryve-backend.projectco.space:4001/api/v1/journey'
  ];
  
  for (const url of urlsToTry) {
    console.log(`🔗 Testing: ${url}`);
    
    try {
      const response = await axios.get(url, { 
        headers,
        timeout: 10000 // 10 second timeout
      });
      
      console.log('✅ SUCCESS!');
      console.log(`📊 Status: ${response.status}`);
      console.log('📊 Statistics:', JSON.stringify(response.data.data?.statistics, null, 2));
      
      // Now test the journey messages endpoint
      const baseUrl = url.replace('/journey', '');
      console.log(`\n🧪 Testing journey messages on: ${baseUrl}`);
      
      const categories = ['goals-achieved', 'heart-to-hearts', 'growth-moments', 'breakthrough-days'];
      
      for (const category of categories) {
        try {
          const msgResponse = await axios.get(
            `${baseUrl}/journey/messages?category=${category}&limit=5`, 
            { headers, timeout: 10000 }
          );
          const count = msgResponse.data.data?.items?.length || 0;
          console.log(`   📂 ${category}: ${count} items`);
        } catch (error) {
          console.log(`   📂 ${category}: ERROR - ${error.message}`);
        }
      }
      
      // Test both endpoint paths for growth-moments
      console.log('\n🔍 Testing Both Endpoint Paths for growth-moments:');
      
      const endpoints = [
        `${baseUrl}/journey/messages?category=growth-moments&limit=10`,
        `${baseUrl}/chats/journey/messages?category=growth-moments&limit=10`
      ];
      
      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(endpoint, { headers, timeout: 10000 });
          console.log(`✅ ${endpoint.includes('/chats/') ? 'Chat Route' : 'Direct Route'}: ${response.data.data?.items?.length || 0} items`);
          console.log(`   Response: ${JSON.stringify(response.data)}`);
        } catch (error) {
          console.log(`❌ ${endpoint.includes('/chats/') ? 'Chat Route' : 'Direct Route'}: ${error.message}`);
        }
      }
      
      return; // Exit after first successful connection
      
    } catch (error) {
      console.log('❌ FAILED');
      console.log(`📊 Error: ${error.code || error.message}`);
      
      if (error.code === 'ENOTFOUND') {
        console.log('💡 DNS resolution failed - domain not found');
      } else if (error.code === 'ECONNREFUSED') {
        console.log('💡 Connection refused - server not responding');
      } else if (error.code === 'ETIMEDOUT') {
        console.log('💡 Connection timeout - server too slow');
      }
      console.log('');
    }
  }
  
  console.log('❌ All URL attempts failed');
  console.log('\n💡 Troubleshooting suggestions:');
  console.log('1. Check if the domain is correct: pryve-backend.projectco.space');
  console.log('2. Verify the server is running and accessible');
  console.log('3. Check if there are any firewall/network restrictions');
  console.log('4. Try accessing the URL directly in a browser');
  console.log('5. Confirm the correct protocol (http vs https)');
}

// Run the test
if (require.main === module) {
  testLiveUrl().catch(console.error);
}

module.exports = { testLiveUrl };