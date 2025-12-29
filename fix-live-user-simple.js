/**
 * Simple fix for live user journey data
 * Run this script on your live server to fix the user's journey messages
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Live user ID from the token logs
const userId = 'cmjk1qe1g0000pecui4vse7td';

async function fixLiveUser() {
  console.log('🔧 Fixing Live User Journey Data');
  console.log(`👤 User ID: ${userId}\n`);
  
  try {
    // Step 1: Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true }
    });
    
    if (!user) {
      console.log('❌ User not found in database');
      return;
    }
    
    console.log('✅ User found:', user.email);
    
    // Step 2: Find user messages with emotions that are NOT favorited
    const emotionalMessages = await prisma.message.findMany({
      where: {
        chat: { userId, isDeleted: false },
        isDeleted: false,
        isFromAI: false,        // Only user messages
        emotion: { not: null }, // Must have emotion
        favoritedBy: { none: { userId } } // NOT already favorited
      },
      select: {
        id: true,
        content: true,
        emotion: true,
        emotionConfidence: true,
        createdAt: true
      },
      take: 10 // Limit to 10 messages
    });
    
    console.log(`📝 Found ${emotionalMessages.length} emotional user messages to favorite`);
    
    if (emotionalMessages.length === 0) {
      console.log('⚠️  No emotional user messages found to favorite');
      
      // Check what the user actually has
      const totalMessages = await prisma.message.count({
        where: { chat: { userId, isDeleted: false }, isDeleted: false }
      });
      
      const userMessages = await prisma.message.count({
        where: { 
          chat: { userId, isDeleted: false }, 
          isDeleted: false, 
          isFromAI: false 
        }
      });
      
      const emotionalUserMessages = await prisma.message.count({
        where: { 
          chat: { userId, isDeleted: false }, 
          isDeleted: false, 
          isFromAI: false,
          emotion: { not: null }
        }
      });
      
      const favorites = await prisma.userMessageFavorite.count({
        where: { userId }
      });
      
      console.log('\n📊 User Data Summary:');
      console.log(`   Total Messages: ${totalMessages}`);
      console.log(`   User Messages: ${userMessages}`);
      console.log(`   User Messages with Emotions: ${emotionalUserMessages}`);
      console.log(`   Favorite Messages: ${favorites}`);
      
      if (emotionalUserMessages === 0) {
        console.log('\n💡 Solution: User needs emotional user messages');
        console.log('   - Check emotion processing pipeline');
        console.log('   - Ensure user messages get emotion analysis');
      } else {
        console.log('\n💡 All emotional user messages are already favorited');
      }
      
      return;
    }
    
    // Step 3: Add these messages to favorites
    console.log('\n⭐ Adding messages to favorites...');
    
    let addedCount = 0;
    for (const message of emotionalMessages) {
      try {
        await prisma.userMessageFavorite.create({
          data: {
            userId,
            messageId: message.id,
            createdAt: message.createdAt
          }
        });
        
        console.log(`✅ Favorited: "${message.content?.substring(0, 50)}..." (${message.emotion})`);
        addedCount++;
        
      } catch (error) {
        if (error.code === 'P2002') {
          console.log(`⚠️  Already favorited: "${message.content?.substring(0, 50)}..."`);
        } else {
          console.log(`❌ Error: ${error.message}`);
        }
      }
    }
    
    // Step 4: Verify the fix
    const qualifiedMessages = await prisma.userMessageFavorite.count({
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
    
    console.log(`\n🎉 Fix completed!`);
    console.log(`📊 Added ${addedCount} new favorites`);
    console.log(`📊 Total journey-qualified messages: ${qualifiedMessages}`);
    
    if (qualifiedMessages > 0) {
      console.log('\n✅ Journey messages should now work!');
      console.log('🧪 Test the endpoints:');
      console.log('   - /api/v1/journey/messages?category=growth-moments');
      console.log('   - /api/v1/chats/journey/messages?category=growth-moments');
    } else {
      console.log('\n⚠️  Still no qualifying messages. Check data requirements.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
if (require.main === module) {
  fixLiveUser().catch(console.error);
}

module.exports = { fixLiveUser };

/*
INSTRUCTIONS FOR USE:

1. Copy this script to your live server
2. Make sure you have the same Prisma setup
3. Run: node fix-live-user-simple.js
4. Test the journey endpoints after running

This will favorite the user's emotional messages, making them available for journey categories.
*/