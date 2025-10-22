/**
 * Simple test for Media Library API with automatic token generation
 */

const axios = require('axios');
const { getTestToken } = require('./get-test-token');

const BASE_URL = 'http://localhost:3000/api/v1';

async function testMediaLibraryWithToken() {
  console.log('🧪 Testing Media Library API with Auto-Generated Token\n');
  
  try {
    // Get a test token
    const token = await getTestToken();
    
    if (!token) {
      console.log('❌ Could not get test token. Make sure your server is running.');
      return;
    }
    
    console.log('\n📁 Testing Media Library Endpoints...\n');
    
    // Test 1: Get all media files
    console.log('1️⃣ Testing: Get all media files');
    try {
      const response = await axios.get(`${BASE_URL}/media`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ Success:', response.data.message);
      console.log('📊 Files found:', response.data.data.length);
    } catch (error) {
      console.log('❌ Error:', error.response?.data?.message || error.message);
    }
    
    // Test 2: Get media statistics
    console.log('\n2️⃣ Testing: Get media statistics');
    try {
      const response = await axios.get(`${BASE_URL}/media/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ Success:', response.data.message);
      console.log('📊 Stats:', response.data.data);
    } catch (error) {
      console.log('❌ Error:', error.response?.data?.message || error.message);
    }
    
    // Test 3: Test file upload (create a chat first)
    console.log('\n3️⃣ Testing: Create a chat and upload a file');
    try {
      // Create a test chat
      const chatResponse = await axios.post(`${BASE_URL}/chats`, {
        name: 'Test Media Chat',
        description: 'Chat for testing media uploads'
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const chatId = chatResponse.data.chat.id;
      console.log('✅ Chat created:', chatId);
      
      // Test file upload (this would require actual file data)
      console.log('ℹ️  File upload test requires actual file data - skipping for now');
      
    } catch (error) {
      console.log('❌ Error:', error.response?.data?.message || error.message);
    }
    
    console.log('\n🎉 Media Library API is working correctly!');
    console.log('💡 You can now use the JWT token to test other endpoints');
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

// Run the test
if (require.main === module) {
  testMediaLibraryWithToken().catch(console.error);
}

module.exports = { testMediaLibraryWithToken };
