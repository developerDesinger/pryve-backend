/**
 * Check data for the live user token
 */

const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const prisma = new PrismaClient();

// Live user token from the logs
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtamsxcWUxZzAwMDBwZWN1aTR2c2U3dGQiLCJyb2xlIjoiQ0xJRU5UIiwiaWF0IjoxNzY3MDEyNTAzLCJleHAiOjE3Njc2MTczMDN9.MteQhI3sDymZLZ09TZE3a7U7Wif72B9Gbz5FymtLll0';

const BASE_URL = 'http://localhost:3400/api/v1'; // Change to live URL if needed
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};

async function checkLiveUserData() {
  console.log('🔍 Checking Live User Data\n');
  
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
      console.log('💡 This might be a production user not in your local database');
      
      // Try to test the live endpoint directly
      console.log('\n🧪 Testing Live Endpoint Directly:');
      try {
        const response = await axios.get(`${BASE_URL}/journey`, { headers });
        console.log('✅ Live /journey endpoint works');
        console.log('📊 Statistics:', JSON.stringify(response.data.data?.statistics, null, 2));
      } catch (error) {
        console.log('❌ Live endpoint test failed:', error.message);
        console.log('💡 Make sure you\'re testing against the correct server URL');
      }
      return;
    }
    
    console.log('\n✅ User found in local database:');
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

    // Check messages breakdown
    const messageStats = await prisma.message.groupBy({
      by: ['isFromAI'],
      where: {
        chat: { userId, isDeleted: false },
        isDeleted: false
      },
      _count: { id: true }
    });

    console.log('\n📝 Message Breakdown:');
    messageStats.forEach(stat => {
      console.log(`   ${stat.isFromAI ? 'AI Messages' : 'User Messages'}: ${stat._count.id}`);
    });

    // Check emotions
    const emotionStats = await prisma.message.findMany({
      where: {
        chat: { userId, isDeleted: false },
        isDeleted: false,
        isFromAI: false,
        emotion: { not: null }
      },
      select: {
        emotion: true,
        emotionConfidence: true,
        content: true
      },
      take: 10
    });

    console.log(`\n😊 User Messages with Emotions: ${emotionStats.length}`);
    if (emotionStats.length > 0) {
      emotionStats.forEach((msg, index) => {
        console.log(`   ${index + 1}. "${msg.content?.substring(0, 40)}..." - ${msg.emotion} (${msg.emotionConfidence})`);
      });
    }

    // Check favorites
    const favorites = await prisma.userMessageFavorite.findMany({
      where: { userId },
      include: {
        message: {
          select: {
            content: true,
            emotion: true,
            isFromAI: true
          }
        }
      }
    });

    console.log(`\n⭐ Favorite Messages: ${favorites.length}`);
    if (favorites.length > 0) {
      favorites.forEach((fav, index) => {
        console.log(`   ${index + 1}. "${fav.message.content?.substring(0, 40)}..." - ${fav.message.isFromAI ? 'AI' : 'User'} - ${fav.message.emotion || 'No emotion'}`);
      });
    }

    // Check journey-qualified messages
    const journeyQualified = await prisma.userMessageFavorite.count({
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

    console.log(`\n🎯 Journey-Qualified Messages: ${journeyQualified}`);

    // Test local endpoints if user exists
    console.log('\n🧪 Testing Local Endpoints:');
    
    try {
      const journeyResponse = await axios.get(`${BASE_URL}/journey`, { headers });
      console.log('✅ Local /journey endpoint works');
      console.log('📊 Statistics:', JSON.stringify(journeyResponse.data.data?.statistics, null, 2));
    } catch (error) {
      console.log('❌ Local /journey endpoint failed:', error.response?.data?.message || error.message);
    }

    // Test growth-moments specifically
    try {
      const growthResponse = await axios.get(`${BASE_URL}/journey/messages?category=growth-moments&limit=10`, { headers });
      console.log(`✅ Growth-moments: ${growthResponse.data.data?.items?.length || 0} items`);
    } catch (error) {
      console.log('❌ Growth-moments failed:', error.response?.data?.message || error.message);
    }

    // Recommendations
    console.log('\n💡 Analysis:');
    if (journeyQualified === 0) {
      console.log('   🔸 No journey-qualified messages found');
      console.log('   🔸 Need: User messages + Favorited + With emotions');
      console.log('   🔸 This explains why growth-moments returns empty array');
    } else {
      console.log('   ✅ Journey-qualified messages exist');
      console.log('   🔸 Check if they match growth-moments criteria');
    }

  } catch (error) {
    console.error('❌ Error checking user data:', error);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Connection refused - make sure your local server is running');
      console.log('   Or update BASE_URL to point to your live server');
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
if (require.main === module) {
  checkLiveUserData().catch(console.error);
}

module.exports = { checkLiveUserData };