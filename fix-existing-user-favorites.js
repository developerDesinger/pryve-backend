const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixExistingUserFavorites() {
  try {
    console.log('🚀 Fixing existing user favorites...\n');

    // Find all users with emotional messages that aren't favorited
    console.log('1. Finding users with emotional messages...');
    
    const usersWithEmotionalMessages = await prisma.user.findMany({
      where: {
        isDeleted: false,
        chats: {
          some: {
            isDeleted: false,
            messages: {
              some: {
                isDeleted: false,
                isFromAI: false,
                emotion: { not: null },
                emotionConfidence: { gte: 0.5 }
              }
            }
          }
        }
      },
      select: {
        id: true,
        email: true,
        fullName: true
      }
    });

    console.log(`✅ Found ${usersWithEmotionalMessages.length} users with emotional messages`);

    for (const user of usersWithEmotionalMessages) {
      console.log(`\n📧 Processing user: ${user.email} (${user.fullName || 'No name'})`);

      // Get all emotional messages for this user that aren't favorited
      const emotionalMessages = await prisma.message.findMany({
        where: {
          isDeleted: false,
          isFromAI: false,
          emotion: { not: null },
          emotionConfidence: { gte: 0.5 },
          chat: {
            userId: user.id,
            isDeleted: false
          },
          // Only messages that aren't already favorited
          favoritedBy: {
            none: {
              userId: user.id
            }
          }
        },
        select: {
          id: true,
          content: true,
          emotion: true,
          emotionConfidence: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      console.log(`   Found ${emotionalMessages.length} unfavorited emotional messages`);

      if (emotionalMessages.length === 0) {
        console.log('   ✅ All emotional messages are already favorited');
        continue;
      }

      // Auto-favorite these messages
      let favoritedCount = 0;
      for (const message of emotionalMessages) {
        try {
          await prisma.userMessageFavorite.create({
            data: {
              userId: user.id,
              messageId: message.id
            }
          });
          favoritedCount++;
          
          console.log(`   ✅ Auto-favorited: "${message.content.substring(0, 50)}..." (${message.emotion}, ${message.emotionConfidence.toFixed(2)})`);
        } catch (error) {
          if (error.code === 'P2002') {
            // Unique constraint violation - already favorited
            console.log(`   ⚠️  Already favorited: "${message.content.substring(0, 50)}..."`);
          } else {
            console.error(`   ❌ Failed to favorite message ${message.id}:`, error.message);
          }
        }
      }

      console.log(`   🎉 Auto-favorited ${favoritedCount} messages for ${user.email}`);
    }

    // Summary statistics
    console.log('\n📊 Summary Statistics:');
    
    const totalFavorites = await prisma.userMessageFavorite.count();
    const totalEmotionalMessages = await prisma.message.count({
      where: {
        isDeleted: false,
        isFromAI: false,
        emotion: { not: null },
        emotionConfidence: { gte: 0.5 }
      }
    });

    console.log(`   Total favorites in system: ${totalFavorites}`);
    console.log(`   Total emotional messages: ${totalEmotionalMessages}`);
    console.log(`   Coverage: ${((totalFavorites / totalEmotionalMessages) * 100).toFixed(1)}%`);

    console.log('\n🎉 Existing user favorites fix completed!');

  } catch (error) {
    console.error('❌ Fix failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixExistingUserFavorites();