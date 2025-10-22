/**
 * Test script for the Media Library API
 * 
 * This script demonstrates how to use the new media library API endpoints
 * Run this after starting your server to test the media library functionality
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

// Configuration
const BASE_URL = 'http://localhost:3000/api/v1';
const TEST_USER_TOKEN = 'your-jwt-token-here'; // Replace with actual JWT token

// Test data
const testMediaQueries = [
  {
    name: 'Get all media files',
    endpoint: '/media',
    query: { page: 1, limit: 10 }
  },
  {
    name: 'Get media files by type (images)',
    endpoint: '/media',
    query: { type: 'images', page: 1, limit: 5 }
  },
  {
    name: 'Get media files by type (audio)',
    endpoint: '/media',
    query: { type: 'audio', page: 1, limit: 5 }
  },
  {
    name: 'Search media files',
    endpoint: '/media',
    query: { search: 'test', page: 1, limit: 10 }
  },
  {
    name: 'Get media statistics',
    endpoint: '/media/stats',
    query: {}
  }
];

async function testMediaLibraryAPI() {
  console.log('📁 Testing Media Library API\n');
  
  for (const test of testMediaQueries) {
    try {
      console.log(`\n📋 ${test.name}`);
      console.log(`Endpoint: ${test.endpoint}`);
      console.log(`Query: ${JSON.stringify(test.query)}`);
      
      const response = await axios.get(`${BASE_URL}${test.endpoint}`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
          'Content-Type': 'application/json'
        },
        params: test.query
      });
      
      console.log(`✅ Status: ${response.status}`);
      console.log(`📊 Results:`);
      
      if (test.endpoint === '/media/stats') {
        console.log(`   - Total files: ${response.data.data.totalFiles}`);
        console.log(`   - Total size: ${response.data.data.totalSize} bytes`);
        console.log(`   - By type:`, response.data.data.byType);
      } else {
        console.log(`   - Files found: ${response.data.data.length}`);
        if (response.data.pagination) {
          console.log(`   - Total items: ${response.data.pagination.totalItems}`);
          console.log(`   - Current page: ${response.data.pagination.currentPage}`);
          console.log(`   - Total pages: ${response.data.pagination.totalPages}`);
        }
        
        // Show sample results
        if (response.data.data.length > 0) {
          const sample = response.data.data[0];
          console.log(`   - Sample file: "${sample.originalName}" (${sample.fileType})`);
          console.log(`   - File URL: ${sample.fileUrl}`);
          console.log(`   - Size: ${sample.fileSize} bytes`);
        }
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
      if (error.response?.status === 401) {
        console.log('   💡 Make sure to set a valid JWT token in TEST_USER_TOKEN');
      }
    }
  }
}

// Test file upload functionality
async function testFileUpload() {
  console.log('\n📤 Testing File Upload Integration\n');
  
  try {
    // Create a test image file (1x1 pixel PNG)
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x0F, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x00, 0x18, 0xDD, 0x8D, 0xB4, 0x00, 0x00, 0x00, 0x00,
      0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    
    const formData = new FormData();
    formData.append('file', testImageBuffer, {
      filename: 'test-image.png',
      contentType: 'image/png'
    });
    formData.append('content', 'Test image upload');
    
    console.log('📤 Uploading test image...');
    
    // Note: This would need a chat ID from an existing chat
    const response = await axios.post(`${BASE_URL}/chats/test-chat-id/messages`, formData, {
      headers: {
        'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        ...formData.getHeaders()
      }
    });
    
    console.log(`✅ Upload successful: ${response.status}`);
    console.log(`📊 Response:`, response.data);
    
  } catch (error) {
    console.log(`❌ Upload Error: ${error.response?.data?.message || error.message}`);
    if (error.response?.status === 401) {
      console.log('   💡 Make sure to set a valid JWT token in TEST_USER_TOKEN');
    }
  }
}

// Example usage instructions
console.log(`
📁 Media Library API Test Script

Before running this test:
1. Start your server: npm start
2. Run database migration: npx prisma db push
3. Get a valid JWT token from login
4. Update TEST_USER_TOKEN in this file
5. Run: node test-media-library.js

API Endpoints:
- GET /api/v1/media - Get all user's media files
- GET /api/v1/media/stats - Get media statistics
- GET /api/v1/media/chat/:chatId - Get media for specific chat
- DELETE /api/v1/media/:mediaId - Delete a media file

Query Parameters:
- type: 'images', 'audio', 'videos', 'documents', 'all' (optional)
- search: Search term (optional)
- page: Page number (optional, default: 1)
- limit: Results per page (optional, default: 20)

Example requests:
- Get all media: GET /media
- Get only images: GET /media?type=images
- Search media: GET /media?search=test
- Get stats: GET /media/stats
`);

// Run the test if this file is executed directly
if (require.main === module) {
  testMediaLibraryAPI()
    .then(() => testFileUpload())
    .catch(console.error);
}

module.exports = { testMediaLibraryAPI, testFileUpload, testMediaQueries };
