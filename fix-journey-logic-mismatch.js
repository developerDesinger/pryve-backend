/**
 * Fix for Journey Logic Mismatch
 * 
 * PROBLEM: 
 * - /journey endpoint counts ALL emotional messages for statistics
 * - /journey/messages endpoint only counts FAVORITED emotional messages
 * 
 * SOLUTION OPTIONS:
 * 1. Make statistics only count favorited messages (align with journey/messages)
 * 2. Make journey/messages count all emotional messages (align with statistics)
 * 3. Add a fallback in journey/messages when no favorites exist
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeLogicMismatch() {
  console.log('🔍 Analyzing Journey Logic Mismatch\n');
  
  const userId = 'cmjk1qe1g0000pecui4vse7td'; // Your live user
  
  try {
    // Get the data that statistics endpoint counts
    const [
      allEmotionalMessages,
      favoritedEmotionalMessages,
      allUserMessages,
      allFavorites
    ] = await Promise.all([
      // What /journey statistics counts for growth moments
      prisma.message.findMany({
        where: {
          chat: { userId, isDeleted: false },
          isDeleted: false,
          isFromAI: false,
          emotion: { in: ["joy", "surprise"] },
          emotionConfidence: { gte: 0.7 },
        },
        select: {
          id: true,
          content: true,
          emotion: true,
          emotionConfidence: true,
          createdAt: true
        }
      }),
      
      // What /journey/messages actually uses
      prisma.userMessageFavorite.findMany({
        where: {
          userId,
          message: {
            chat: { userId, isDeleted: false },
            isDeleted: false,
            isFromAI: false,
            emotion: { not: null },
          },
        },
        include: {
          message: {
            select: {
              id: true,
              content: true,
              emotion: true,
              emotionConfidence: true,
              createdAt: true
            }
          }
        }
      }),
      
      // All user messages with emotions
      prisma.message.findMany({
        where: {
          chat: { userId, isDeleted: false },
          isDeleted: false,
          isFromAI: false,
          emotion: { not: null },
        },
        select: {
          id: true,
          content: true,
          emotion: true,
          emotionConfidence: true,
          createdAt: true
        }
      }),
      
      // All favorites (including AI messages)
      prisma.userMessageFavorite.findMany({
        where: { userId },
        include: {
          message: {
            select: {
              id: true,
              content: true,
              emotion: true,
              isFromAI: true,
              createdAt: true
            }
          }
        }
      })
    ]);
    
    console.log('📊 DATA ANALYSIS:');
    console.log('=' .repeat(50));
    
    console.log(`\n1️⃣ STATISTICS ENDPOINT (/journey) counts:`);
    console.log(`   Growth Moments (joy/surprise, conf>=0.7): ${allEmotionalMessages.length}`);
    console.log(`   All User Messages with Emotions: ${allUserMessages.length}`);
    
    console.log(`\n2️⃣ JOURNEY MESSAGES ENDPOINT (/journey/messages) uses:`);
    console.log(`   Favorited Emotional User Messages: ${favoritedEmotionalMessages.length}`);
    
    console.log(`\n3️⃣ USER'S ACTUAL DATA:`);
    console.log(`   Total Favorites: ${allFavorites.length}`);
    console.log(`   User Message Favorites: ${allFavorites.filter(f => !f.message.isFromAI).length}`);
    console.log(`   AI Message Favorites: ${allFavorites.filter(f => f.message.isFromAI).length}`);
    
    console.log('\n📋 DETAILED BREAKDOWN:');
    console.log('-'.repeat(30));
    
    if (allEmotionalMessages.length > 0) {
      console.log('\n🎯 Growth Moments (Statistics Counts):');
      allEmotionalMessages.forEach((msg, index) => {
        const isFavorited = favoritedEmotionalMessages.some(f => f.message.id === msg.id);
        console.log(`   ${index + 1}. "${msg.content?.substring(0, 40)}..." (${msg.emotion})`);
        console.log(`      Favorited: ${isFavorited ? '⭐ YES' : '❌ NO'}`);
      });
    }
    
    if (allFavorites.length > 0) {
      console.log('\n⭐ All Favorites:');
      allFavorites.forEach((fav, index) => {
        console.log(`   ${index + 1}. ${fav.message.isFromAI ? 'AI' : 'USER'}: "${fav.message.content?.substring(0, 40)}..."`);
        console.log(`      Emotion: ${fav.message.emotion || 'NONE'}`);
      });
    }
    
    console.log('\n🔧 MISMATCH ANALYSIS:');
    console.log('=' .repeat(50));
    
    const mismatchCount = allEmotionalMessages.length - favoritedEmotionalMessages.length;
    
    if (mismatchCount > 0) {
      console.log(`❌ MISMATCH CONFIRMED: ${mismatchCount} messages counted in statistics but not in journey messages`);
      console.log('\n💡 ROOT CAUSE:');
      console.log('   - Statistics count ALL emotional messages');
      console.log('   - Journey messages only count FAVORITED emotional messages');
      console.log('   - User has emotional messages but they\'re not favorited');
      
      console.log('\n🔧 SOLUTION OPTIONS:');
      console.log('\n   OPTION 1: Quick Fix - Favorite the emotional messages');
      console.log('   ✅ Pros: Immediate fix, no code changes');
      console.log('   ❌ Cons: Manual process for each user');
      
      console.log('\n   OPTION 2: Code Fix - Align statistics with journey messages');
      console.log('   ✅ Pros: Consistent logic');
      console.log('   ❌ Cons: Statistics will show lower numbers');
      
      console.log('\n   OPTION 3: Code Fix - Add fallback in journey messages');
      console.log('   ✅ Pros: Best user experience');
      console.log('   ❌ Cons: More complex logic');
      
    } else {
      console.log('✅ NO MISMATCH: Statistics and journey messages are aligned');
    }
    
    console.log('\n🎯 RECOMMENDED SOLUTION:');
    console.log('   Modify journey messages to include non-favorited emotional messages');
    console.log('   when no favorited emotional messages exist (graceful fallback)');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the analysis
if (require.main === module) {
  analyzeLogicMismatch().catch(console.error);
}

module.exports = { analyzeLogicMismatch };