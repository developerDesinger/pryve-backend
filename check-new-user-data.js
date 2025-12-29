/**
 * Check data for the new user token
 */

const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const prisma = new PrismaClient();

// New user token
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtaXI2cmt2bzAwMDF1anRnNDlwbndoeWEiLCJyb2xlIjoiQ0xJRU5UIiwiaWF0IjoxNzY3MDA5MzIxLCJleHAiOjE3Njc2MTQxMjF9.vDEXZ0VOBAOqozMZAcHYA2by5shX-8ZXvvdAFy378MQ';

const BASE_URL = 'http://localhost:3400/api/v1';
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};

async function checkNewUserData() {
  console.log('🔍 Checking New User Data\n');
  
  try {
    // Decode the JWT token to get user ID
    const decoded = jwt.decode(token);
    const userId = decoded.id;
    
    console.log('👤 Decoded Token Info:');
    console.log(`   User ID: ${userId}`);
    console.log(`   Role: ${decoded.role}`);
    console.log(`   Issued At: ${new Date(decoded.iat * 1000)}`);
    console.log(`   Expires At: ${new Date(decoded.exp * 1000)}`);
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        fullName: true, 
        email: true, 
        createdAt: true,
        userName: true 
      }
    });
    
    if (!user) {
      console.log('\n❌ User not found in database!');
      return;
    }
    
    console.log('\n✅ User found:');
    console.log(`   Name: ${user.fullName || 'Not set'}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Username: ${user.userName || 'Not set'}`);
    console.log(`   Created: ${user.createdAt}`);

    // Check chats
    const chats = await prisma.chat.findMany({
      where: { userId, isDeleted: false },
      select: { 
        id: true, 
        name: true, 
        type: true, 
        createdAt: true,
        _count: { select: { messages: true } } 
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`\n💬 Chats: ${chats.length}`);
    if (chats.length > 0) {
      chats.forEach((chat, index) => {
        console.log(`   ${index + 1}. ${chat.name || 'Unnamed'} (${chat.type})`);
        console.log(`      Messages: ${chat._count.messages}, Created: ${chat.createdAt}`);
      });
    } else {
      console.log('   No chats found');
    }

    // Check total messages
    const totalMessages = await prisma.message.count({
      where: {
        chat: { userId, isDeleted: false },
        isDeleted: false
      }
    });
    
    console.log(`\n📝 Total Messages: ${totalMessages}`);

    // Check user messages (non-AI)
    const userMessages = await prisma.message.count({
      where: {
        chat: { userId, isDeleted: false },
        isDeleted: false,
        isFromAI: false
      }
    });
    
    console.log(`👤 User Messages (non-AI): ${userMessages}`);

    // Check messages with emotion data
    const emotionalMessages = await prisma.message.count({
      where: {
        chat: { userId, isDeleted: false },
        isDeleted: false,
        isFromAI: false,
        emotion: { not: null }
      }
    });
    
    console.log(`😊 User Messages with Emotion: ${emotionalMessages}`);

    // Check favorite messages
    const favoriteMessages = await prisma.userMessageFavorite.count({
      where: { userId }
    });
    
    console.log(`⭐ Favorite Messages: ${favoriteMessages}`);

    // Check favorite messages with emotion (required for journey)
    const favoritesWithEmotion = await prisma.userMessageFavorite.count({
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
    
    console.log(`⭐😊 Favorite Messages with Emotion: ${favoritesWithEmotion}`);

    // Sample some recent messages if they exist
    if (totalMessages > 0) {
      console.log('\n📋 Recent Messages Sample:');
      const sampleMessages = await prisma.message.findMany({
        where: {
          chat: { userId, isDeleted: false },
          isDeleted: false
        },
        select: {
          id: true,
          content: true,
          isFromAI: true,
          emotion: true,
          emotionConfidence: true,
          createdAt: true,
          chat: { select: { name: true } }
        },
        take: 5,
        orderBy: { createdAt: 'desc' }
      });
      
      sampleMessages.forEach((msg, index) => {
        console.log(`\n   ${index + 1}. ${msg.isFromAI ? 'AI' : 'User'} in "${msg.chat.name}"`);
        console.log(`      Content: "${msg.content?.substring(0, 80)}..."`);
        console.log(`      Emotion: ${msg.emotion || 'none'} (${msg.emotionConfidence || 'N/A'})`);
        console.log(`      Date: ${msg.createdAt}`);
      });
    }

    // Test the journey endpoints
    console.log('\n🧪 Testing Journey Endpoints:');
    
    try {
      const journeyResponse = await axios.get(`${BASE_URL}/journey`, { headers });
      console.log('✅ /journey endpoint works');
      console.log('📊 Statistics:', JSON.stringify(journeyResponse.data.data?.statistics, null, 2));
    } catch (error) {
      console.log('❌ /journey endpoint failed:', error.response?.data?.message || error.message);
    }

    // Test journey messages
    const categories = ['goals-achieved', 'heart-to-hearts', 'growth-moments', 'breakthrough-days'];
    
    for (const category of categories) {
      try {
        const response = await axios.get(
          `${BASE_URL}/journey/messages?category=${category}&limit=5`, 
          { headers }
        );
        console.log(`✅ ${category}: ${response.data.data?.items?.length || 0} items`);
      } catch (error) {
        console.log(`❌ ${category}: ${error.response?.data?.message || error.message}`);
      }
    }

    // Recommendations
    console.log('\n💡 Analysis & Recommendations:');
    if (totalMessages === 0) {
      console.log('   🔸 User has no conversations - needs to chat first');
    } else if (userMessages === 0) {
      console.log('   🔸 All messages are from AI - user needs to send messages');
    } else if (emotionalMessages === 0) {
      console.log('   🔸 No emotion data - check emotion processing pipeline');
    } else if (favoriteMessages === 0) {
      console.log('   🔸 No favorite messages - user needs to mark messages as favorites');
    } else if (favoritesWithEmotion === 0) {
      console.log('   🔸 No favorite messages with emotions - need both favorites AND emotions');
    } else {
      console.log('   ✅ Data looks sufficient for journey messages');
    }

  } catch (error) {
    console.error('❌ Error checking user data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
if (require.main === module) {
  checkNewUserData().catch(console.error);
}

module.exports = { checkNewUserData };