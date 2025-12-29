/**
 * Debug the mismatch between favorites and emotions for the new user
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const userId = 'cmir6rkvo0001ujtg49pnwhya'; // From the new token

async function debugFavoritesEmotions() {
  console.log('🔍 Debugging Favorites vs Emotions Mismatch\n');
  
  try {
    // Get all user messages with their favorite status
    const allMessages = await prisma.message.findMany({
      where: {
        chat: { userId, isDeleted: false },
        isDeleted: false,
        isFromAI: false
      },
      select: {
        id: true,
        content: true,
        emotion: true,
        emotionConfidence: true,
        createdAt: true,
        favoritedBy: {
          where: { userId },
          select: { id: true, createdAt: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📝 Total User Messages: ${allMessages.length}\n`);

    allMessages.forEach((msg, index) => {
      const isFavorited = msg.favoritedBy.length > 0;
      const hasEmotion = msg.emotion !== null;
      
      console.log(`${index + 1}. Message ID: ${msg.id}`);
      console.log(`   Content: "${msg.content?.substring(0, 60)}..."`);
      console.log(`   Favorited: ${isFavorited ? '⭐ YES' : '❌ NO'}`);
      console.log(`   Emotion: ${hasEmotion ? `😊 ${msg.emotion} (${msg.emotionConfidence})` : '❌ NO'}`);
      console.log(`   Both: ${isFavorited && hasEmotion ? '✅ YES' : '❌ NO'}`);
      console.log(`   Date: ${msg.createdAt}\n`);
    });

    // Get favorite messages details
    console.log('⭐ Favorite Messages Details:');
    const favorites = await prisma.userMessageFavorite.findMany({
      where: { userId },
      include: {
        message: {
          select: {
            id: true,
            content: true,
            emotion: true,
            emotionConfidence: true,
            isFromAI: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    favorites.forEach((fav, index) => {
      console.log(`\n${index + 1}. Favorite ID: ${fav.id}`);
      console.log(`   Message: "${fav.message.content?.substring(0, 60)}..."`);
      console.log(`   From AI: ${fav.message.isFromAI}`);
      console.log(`   Emotion: ${fav.message.emotion || 'NONE'} (${fav.message.emotionConfidence || 'N/A'})`);
      console.log(`   Favorited: ${fav.createdAt}`);
    });

    // Check what the journey service is actually looking for
    console.log('\n🔍 Journey Service Query Simulation:');
    const journeyQualifiedFavorites = await prisma.userMessageFavorite.findMany({
      where: {
        userId,
        message: {
          chat: { userId, isDeleted: false },
          isDeleted: false,
          isFromAI: false,        // Only user messages
          emotion: { not: null }, // Must have emotion data
        },
      },
      include: {
        message: {
          select: {
            id: true,
            content: true,
            emotion: true,
            emotionConfidence: true
          }
        }
      }
    });

    console.log(`📊 Messages qualifying for journey: ${journeyQualifiedFavorites.length}`);
    
    if (journeyQualifiedFavorites.length === 0) {
      console.log('\n❌ NO MESSAGES QUALIFY FOR JOURNEY because:');
      console.log('   - Need to be favorited ⭐');
      console.log('   - Need to be from user (not AI) 👤');
      console.log('   - Need to have emotion data 😊');
      console.log('   - This user has favorites but they lack emotions OR emotions but not favorited');
    }

    // Solution: Add emotions to favorited messages OR favorite the emotional messages
    console.log('\n💡 SOLUTIONS:');
    
    const favoritedWithoutEmotion = favorites.filter(f => !f.message.emotion);
    const emotionalNotFavorited = allMessages.filter(m => m.emotion && m.favoritedBy.length === 0);
    
    if (favoritedWithoutEmotion.length > 0) {
      console.log(`\n🔧 Option 1: Add emotions to ${favoritedWithoutEmotion.length} favorited messages`);
      favoritedWithoutEmotion.forEach((fav, index) => {
        console.log(`   ${index + 1}. Message ${fav.message.id}: "${fav.message.content?.substring(0, 40)}..."`);
      });
    }
    
    if (emotionalNotFavorited.length > 0) {
      console.log(`\n🔧 Option 2: Favorite ${emotionalNotFavorited.length} emotional messages`);
      emotionalNotFavorited.forEach((msg, index) => {
        console.log(`   ${index + 1}. Message ${msg.id}: "${msg.content?.substring(0, 40)}..." (${msg.emotion})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug
if (require.main === module) {
  debugFavoritesEmotions().catch(console.error);
}

module.exports = { debugFavoritesEmotions };