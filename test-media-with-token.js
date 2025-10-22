/**
 * Test Media Library API with provided JWT token
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';
const TEST_USER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtZ20wczc1ZTAwMDB1amljc29vZjQwYTciLCJyb2xlIjoiQ0xJRU5UIiwiaWF0IjoxNzYxMTM4ODA3LCJleHAiOjE3NjE3NDM2MDd9.dvx0ZuK4cFXMxdZNxXwiekZj3uLIh00pbsqg4aO9wWM';

async function testMediaLibraryAPI() {
  console.log('🧪 Testing Media Library API with Provided Token\n');
  
  try {
    // Test 1: Get all media files
    console.log('1️⃣ Testing: Get all media files');
    try {
      const response = await axios.get(`${BASE_URL}/media`, {
        headers: { 'Authorization': `Bearer ${TEST_USER_TOKEN}` }
      });
      console.log('✅ Success:', response.data.message);
      console.log('📊 Files found:', response.data.data.length);
      console.log('📋 Data:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('❌ Error:', error.response?.data?.message || error.message);
      console.log('📋 Full error:', error.response?.data);
    }
    
    // Test 2: Get media statistics
    console.log('\n2️⃣ Testing: Get media statistics');
    try {
      const response = await axios.get(`${BASE_URL}/media/stats`, {
        headers: { 'Authorization': `Bearer ${TEST_USER_TOKEN}` }
      });
      console.log('✅ Success:', response.data.message);
      console.log('📊 Stats:', JSON.stringify(response.data.data, null, 2));
    } catch (error) {
      console.log('❌ Error:', error.response?.data?.message || error.message);
      console.log('📋 Full error:', error.response?.data);
    }
    
    // Test 3: Get user's chats first
    console.log('\n3️⃣ Testing: Get user chats');
    try {
      const response = await axios.get(`${BASE_URL}/chats`, {
        headers: { 'Authorization': `Bearer ${TEST_USER_TOKEN}` }
      });
      console.log('✅ Success:', response.data.message);
      console.log('📊 Chats found:', response.data.data.length);
      
      if (response.data.data.length > 0) {
        const chatId = response.data.data[0].id;
        console.log('📋 First chat ID:', chatId);
        
        // Test 4: Get media for specific chat
        console.log('\n4️⃣ Testing: Get media for specific chat');
        try {
          const mediaResponse = await axios.get(`${BASE_URL}/media/chat/${chatId}`, {
            headers: { 'Authorization': `Bearer ${TEST_USER_TOKEN}` }
          });
          console.log('✅ Success:', mediaResponse.data.message);
          console.log('📊 Media files in chat:', mediaResponse.data.data.length);
          console.log('📋 Data:', JSON.stringify(mediaResponse.data, null, 2));
        } catch (error) {
          console.log('❌ Error:', error.response?.data?.message || error.message);
        }
      }
    } catch (error) {
      console.log('❌ Error:', error.response?.data?.message || error.message);
    }
    
    // Test 5: Test different query parameters
    console.log('\n5️⃣ Testing: Get media by type (images)');
    try {
      const response = await axios.get(`${BASE_URL}/media?type=images`, {
        headers: { 'Authorization': `Bearer ${TEST_USER_TOKEN}` }
      });
      console.log('✅ Success:', response.data.message);
      console.log('📊 Images found:', response.data.data.length);
    } catch (error) {
      console.log('❌ Error:', error.response?.data?.message || error.message);
    }
    
    console.log('\n🎉 Media Library API Testing Complete!');
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

// Run the test
if (require.main === module) {
  testMediaLibraryAPI().catch(console.error);
}

module.exports = { testMediaLibraryAPI };
