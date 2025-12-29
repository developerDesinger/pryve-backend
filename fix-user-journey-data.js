/**
 * Fix the user's journey data by favoriting their emotional messages
 */

const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();
const userId = 'cmir6rkvo0001ujtg49pnwhya'; // From the new token

const BASE_URL = 'http://localhost:3400/api/v1';
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtaXI2cmt2bzAwMDF1anRnNDlwbndoeWEiLCJyb2xlIjoiQ0xJRU5UIiwiaWF0IjoxNzY3MDA5MzIxLCJleHAiOjE3Njc2MTQxMjF9.vDEXZ0VOBAOqozMZAcHYA2by5shX-8ZXvvdAFy378MQ';

const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};

async function fixUserJourneyData() {
  console.log('🔧 Fixing User Journey Data\n');
  
  try {
    // Get all user messages with emotions that are NOT favorited
    const emotionalMessages = await prisma.message.findMany({
      where: {
        chat: { userId, isDeleted: false },
        isDeleted: false,
        isFromAI: false,
        emotion: { not: null },
        favoritedBy: { none: { userId } } // Not already favorited
      },
      select: {
        id: true,
        content: true,
        emotion: true,
        emotionConfidence: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📝 Found ${emotionalMessages.length} emotional user messages to favorite:`);
    
    emotionalMessages.forEach((msg, index) => {
      console.log(`\n${index + 1}. Message ID: ${msg.id}`);
      console.log(`   Content: "${msg.content?.substring(0, 60)}..."`);
      console.log(`   Emotion: ${msg.emotion} (${msg.emotionConfidence})`);
      console.log(`   Date: ${msg.createdAt}`);
    });

    if (emotionalMessages.length === 0) {
      console.log('⚠️  No emotional messages found to favorite');
      return;
    }

    // Add these messages to favorites
    console.log('\n⭐ Adding messages to favorites...');
    
    for (const message of emotionalMessages) {
      try {
        await prisma.userMessageFavorite.create({
          data: {
            userId,
            messageId: message.id,
            createdAt: message.createdAt // Use original message date
          }
        });
        console.log(`✅ Favorited: "${message.content?.substring(0, 40)}..." (${message.emotion})`);
      } catch (error) {
        if (error.code === 'P2002') {
          console.log(`⚠️  Already favorited: "${message.content?.substring(0, 40)}..."`);
        } else {
          console.log(`❌ Error favoriting message: ${error.message}`);
        }
      }
    }

    // Verify the fix
    console.log('\n🧪 Verifying the fix...');
    
    const qualifiedFavorites = await prisma.userMessageFavorite.count({
      where: {
        userId,
        message: {
          chat: { userId, isDeleted: false },
          isDeleted: false,
          isFromAI: false,
          emotion: { not: null }
        }
      }
    });

    console.log(`📊 Messages now qualifying for journey: ${qualifiedFavorites}`);

    // Test the journey endpoints
    console.log('\n🧪 Testing Journey Endpoints After Fix:');
    
    try {
      const journeyResponse = await axios.get(`${BASE_URL}/journey`, { headers });
      console.log('✅ /journey endpoint works');
      console.log('📊 Updated Statistics:', JSON.stringify(journeyResponse.data.data?.statistics, null, 2));
    } catch (error) {
      console.log('❌ /journey endpoint failed:', error.response?.data?.message || error.message);
    }

    // Test journey messages by category
    const categories = ['goals-achieved', 'heart-to-hearts', 'growth-moments', 'breakthrough-days'];
    
    console.log('\n📂 Testing Journey Messages by Category:');
    for (const category of categories) {
      try {
        const response = await axios.get(
          `${BASE_URL}/journey/messages?category=${category}&limit=5`, 
          { headers }
        );
        const count = response.data.data?.items?.length || 0;
        console.log(`   ${category}: ${count} items`);
        
        if (count > 0) {
          response.data.data.items.forEach((item, index) => {
            console.log(`      ${index + 1}. ${item.title || item.content?.substring(0, 40)}`);
          });
        }
      } catch (error) {
        console.log(`   ${category}: ERROR - ${error.response?.data?.message || error.message}`);
      }
    }

    // Test both endpoint paths
    console.log('\n🔗 Testing Both Endpoint Paths:');
    
    const endpoints = [
      { name: 'Direct Route', url: `${BASE_URL}/journey/messages?category=goals-achieved&limit=5` },
      { name: 'Chat Route', url: `${BASE_URL}/chats/journey/messages?category=goals-achieved&limit=5` }
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(endpoint.url, { headers });
        console.log(`✅ ${endpoint.name}: ${response.data.data?.items?.length || 0} items`);
      } catch (error) {
        console.log(`❌ ${endpoint.name}: ${error.response?.data?.message || error.message}`);
      }
    }

    console.log('\n🎉 Fix completed! Journey messages should now work.');

  } catch (error) {
    console.error('❌ Error fixing user data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
if (require.main === module) {
  fixUserJourneyData().catch(console.error);
}

module.exports = { fixUserJourneyData };