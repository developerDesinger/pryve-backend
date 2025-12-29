/**
 * Check what data exists for the user to understand why journey messages are empty
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUserData() {
  const userId = 'cmggqnlvj0000ujdgebqtdzvv'; // From the JWT token
  
  console.log('🔍 Checking User Data for Journey Messages\n');
  console.log(`👤 User ID: ${userId}\n`);

  try {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, email: true }
    });
    
    if (!user) {
      console.log('❌ User not found!');
      return;
    }
    
    console.log('✅ User found:', user);

    // Check chats
    const chats = await prisma.chat.findMany({
      where: { userId, isDeleted: false },
      select: { id: true, name: true, type: true, _count: { select: { messages: true } } }
    });
    
    console.log(`\n💬 Chats: ${chats.length}`);
    chats.forEach(chat => {
      console.log(`  - ${chat.name} (${chat.type}): ${chat._count.messages} messages`);
    });

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

    // Check favorite messages with emotion
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

    // Sample some messages to see their structure
    if (totalMessages > 0) {
      console.log('\n📋 Sample Messages:');
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
          createdAt: true
        },
        take: 5,
        orderBy: { createdAt: 'desc' }
      });
      
      sampleMessages.forEach((msg, index) => {
        console.log(`  ${index + 1}. ${msg.isFromAI ? 'AI' : 'User'}: "${msg.content.substring(0, 50)}..."`);
        console.log(`     Emotion: ${msg.emotion || 'none'} (${msg.emotionConfidence || 'N/A'})`);
        console.log(`     Date: ${msg.createdAt}`);
        console.log('');
      });
    }

    // Recommendations
    console.log('\n💡 Recommendations:');
    if (totalMessages === 0) {
      console.log('  - User needs to have conversations first');
    } else if (userMessages === 0) {
      console.log('  - All messages are from AI. User needs to send messages.');
    } else if (emotionalMessages === 0) {
      console.log('  - Messages need emotion analysis. Check if emotion processing is working.');
    } else if (favoriteMessages === 0) {
      console.log('  - User needs to mark messages as favorites to see journey data.');
    } else {
      console.log('  - Data looks good! Journey messages should be working.');
    }

  } catch (error) {
    console.error('❌ Error checking user data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
if (require.main === module) {
  checkUserData().catch(console.error);
}

module.exports = { checkUserData };