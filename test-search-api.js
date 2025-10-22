/**
 * Test script for the Search Conversations API
 * 
 * This script demonstrates how to use the new search API endpoint
 * Run this after starting your server to test the search functionality
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000/api/v1';
const TEST_USER_TOKEN = 'your-jwt-token-here'; // Replace with actual JWT token

// Test data - you'll need to create some chats and messages first
const testSearchQueries = [
  {
    name: 'Search all conversations',
    query: { q: 'python', type: 'all', page: 1, limit: 10 }
  },
  {
    name: 'Search only chats',
    query: { q: 'programming', type: 'chats', page: 1, limit: 5 }
  },
  {
    name: 'Search only messages',
    query: { q: 'function', type: 'messages', page: 1, limit: 10 }
  },
  {
    name: 'Search with pagination',
    query: { q: 'help', type: 'all', page: 2, limit: 5 }
  }
];

async function testSearchAPI() {
  console.log('🔍 Testing Search Conversations API\n');
  
  for (const test of testSearchQueries) {
    try {
      console.log(`\n📋 ${test.name}`);
      console.log(`Query: ${JSON.stringify(test.query)}`);
      
      const response = await axios.get(`${BASE_URL}/chats/search`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
          'Content-Type': 'application/json'
        },
        params: test.query
      });
      
      console.log(`✅ Status: ${response.status}`);
      console.log(`📊 Results:`);
      console.log(`   - Chats found: ${response.data.data.chats.length}`);
      console.log(`   - Messages found: ${response.data.data.messages.length}`);
      console.log(`   - Total items: ${response.data.pagination.totalItems}`);
      console.log(`   - Current page: ${response.data.pagination.currentPage}`);
      console.log(`   - Total pages: ${response.data.pagination.totalPages}`);
      
      // Show sample results
      if (response.data.data.chats.length > 0) {
        console.log(`   - Sample chat: "${response.data.data.chats[0].name}"`);
      }
      if (response.data.data.messages.length > 0) {
        console.log(`   - Sample message: "${response.data.data.messages[0].content?.substring(0, 50)}..."`);
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
      if (error.response?.status === 401) {
        console.log('   💡 Make sure to set a valid JWT token in TEST_USER_TOKEN');
      }
    }
  }
}

// Example usage instructions
console.log(`
🚀 Search Conversations API Test Script

Before running this test:
1. Start your server: npm start
2. Create some test chats and messages
3. Get a valid JWT token from login
4. Update TEST_USER_TOKEN in this file
5. Run: node test-search-api.js

API Endpoint: GET ${BASE_URL}/chats/search

Query Parameters:
- q: Search term (required)
- type: 'all', 'chats', or 'messages' (optional, default: 'all')
- page: Page number (optional, default: 1)
- limit: Results per page (optional, default: 20)

Example requests:
- Search everything: GET /chats/search?q=python
- Search only chats: GET /chats/search?q=programming&type=chats
- Search with pagination: GET /chats/search?q=help&page=2&limit=5
`);

// Run the test if this file is executed directly
if (require.main === module) {
  testSearchAPI().catch(console.error);
}

module.exports = { testSearchAPI, testSearchQueries };
