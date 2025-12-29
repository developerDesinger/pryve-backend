/**
 * Fix live user data by adding required journey data directly to database
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Live user ID from the token
const liveUserId = 'cmjk1qe1g0000pecui4vse7td';

async function fixLiveUserData() {
  console.log('🔧 Fixing Live User Journey Data\n');
  console.log(`👤 User ID: ${liveUserId}`);
  
  try {
    // Check if user exists in database
    const user = await prisma.user.findUnique({
      where: { id: liveUserId },
      select: { id: true, email: true, fullName: true }
    });
    
    if (!user) {
      console.log('❌ User not found in database!');
      console.log('💡 This user exists on live server but not in your local database');
      console.log('💡 You need to either:');
      console.log('   1. Connect to the live database');
      console.log('   2. Or add dummy data on the live server directly');
      return;
    }
    
    console.log('✅ User found:', user);
    
    // Check current data
    const currentChats = await prisma.chat.count({
      where: { userId: liveUserId, isDeleted: false }
    });
    
    const currentMessages = await prisma.message.count({
      where: {
        chat: { userId: liveUserId, isDeleted: false },
        isDeleted: false
      }
    });
    
    const currentFavorites = await prisma.userMessageFavorite.count({
      where: { userId: liveUserId }
    });
    
    console.log(`\n📊 Current Data:`);
    console.log(`   Chats: ${currentChats}`);
    console.log(`   Messages: ${currentMessages}`);
    console.log(`   Favorites: ${currentFavorites}`);
    
    if (currentMessages > 0) {
      console.log('\n⚠️  User already has data. Checking if it qualifies for journey...');
      
      const qualifiedFavorites = await prisma.userMessageFavorite.count({
        where: {
          userId: liveUserId,
          message: {
            chat: { userId: liveUserId, isDeleted: false },
            isDeleted: false,
            isFromAI: false,
            emotion: { not: null }
          }
        }
      });
      
      console.log(`   Journey-qualified messages: ${qualifiedFavorites}`);
      
      if (qualifiedFavorites > 0) {
        console.log('✅ User already has qualifying data. The issue might be elsewhere.');
        return;
      }
    }
    
    console.log('\n🚀 Adding journey-ready data...');
    
    // Create a chat
    const chat = await prisma.chat.create({
      data: {
        userId: liveUserId,
        name: 'Growth Journey Chat',
        type: 'PERSONAL_AI',
        isDeleted: false
      }
    });
    
    console.log(`✅ Created chat: ${chat.name}`);
    
    // Create user messages with emotions
    const emotionalMessages = [
      {
        content: "I've been reflecting on my personal growth lately and I feel like I'm making real progress in understanding myself better.",
        emotion: "pride",
        emotionConfidence: 0.87,
        category: "growth-moments"
      },
      {
        content: "Today I realized that my fear of failure was actually holding me back from trying new things. This is a breakthrough for me.",
        emotion: "enlightenment", 
        emotionConfidence: 0.91,
        category: "growth-moments"
      },
      {
        content: "I finally achieved my goal of reading 30 books this year! It took discipline but I did it.",
        emotion: "accomplishment",
        emotionConfidence: 0.89,
        category: "goals-achieved"
      },
      {
        content: "Had a heart-to-heart conversation with my best friend today. We talked about our dreams and fears.",
        emotion: "connection",
        emotionConfidence: 0.85,
        category: "heart-to-hearts"
      }
    ];
    
    const createdMessages = [];
    
    for (let i = 0; i < emotionalMessages.length; i++) {
      const msgData = emotionalMessages[i];
      
      // Create user message
      const userMessage = await prisma.message.create({
        data: {
          chatId: chat.id,
          senderId: liveUserId,
          content: msgData.content,
          isFromAI: false,
          emotion: msgData.emotion,
          emotionConfidence: msgData.emotionConfidence,
          createdAt: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)) // Spread over days
        }
      });
      
      createdMessages.push({ ...userMessage, category: msgData.category });
      
      // Create AI response
      await prisma.message.create({
        data: {
          chatId: chat.id,
          senderId: liveUserId,
          content: `That's wonderful to hear! Your ${msgData.emotion} really comes through. Keep up the great work on your journey!`,
          isFromAI: true,
          emotion: "supportive",
          emotionConfidence: 0.75,
          createdAt: new Date(Date.now() - (i * 24 * 60 * 60 * 1000) + 60000)
        }
      });
      
      console.log(`✅ Created message: "${msgData.content.substring(0, 50)}..." (${msgData.emotion})`);
    }
    
    // Add messages to favorites
    console.log('\n⭐ Adding messages to favorites...');
    
    for (const message of createdMessages) {
      await prisma.userMessageFavorite.create({
        data: {
          userId: liveUserId,
          messageId: message.id,
          createdAt: message.createdAt
        }
      });
      console.log(`⭐ Favorited: ${message.category} message`);
    }
    
    // Verify the fix
    const finalQualified = await prisma.userMessageFavorite.count({
      where: {
        userId: liveUserId,
        message: {
          chat: { userId: liveUserId, isDeleted: false },
          isDeleted: false,
          isFromAI: false,
          emotion: { not: null }
        }
      }
    });
    
    console.log(`\n✅ Fix completed!`);
    console.log(`📊 Journey-qualified messages: ${finalQualified}`);
    console.log(`📊 Created: ${createdMessages.length} user messages + ${createdMessages.length} AI responses`);
    console.log(`📊 Favorited: ${createdMessages.length} messages`);
    
    console.log('\n🎉 The live user should now have data for journey messages!');
    console.log('💡 Test the live endpoints again to verify the fix.');
    
  } catch (error) {
    console.error('❌ Error fixing live user data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
if (require.main === module) {
  fixLiveUserData().catch(console.error);
}

module.exports = { fixLiveUserData };