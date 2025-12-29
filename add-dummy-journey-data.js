/**
 * Add dummy data for testing journey messages endpoints
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const userId = 'cmggqnlvj0000ujdgebqtdzvv'; // From the JWT token

// Sample emotions and messages for different categories
const emotionalMessages = [
  // Goals achieved messages
  {
    content: "I finally completed my fitness goal! Lost 20 pounds in 3 months through consistent workouts and healthy eating.",
    emotion: "joy",
    emotionConfidence: 0.92,
    category: "goals-achieved"
  },
  {
    content: "Just got promoted to senior developer! All those late nights studying and working on side projects paid off.",
    emotion: "pride",
    emotionConfidence: 0.88,
    category: "goals-achieved"
  },
  {
    content: "Finished reading 50 books this year! My goal was 30, so I exceeded my expectations.",
    emotion: "accomplishment",
    emotionConfidence: 0.85,
    category: "goals-achieved"
  },
  
  // Breakthrough days messages
  {
    content: "Today I realized that my anxiety was holding me back from pursuing my dreams. I'm ready to take action now.",
    emotion: "enlightenment",
    emotionConfidence: 0.89,
    category: "breakthrough-days"
  },
  {
    content: "Had an amazing conversation with my mentor today. I finally understand what I want to do with my career.",
    emotion: "clarity",
    emotionConfidence: 0.91,
    category: "breakthrough-days"
  },
  {
    content: "Overcame my fear of public speaking today. Gave a presentation to 100 people and felt confident throughout.",
    emotion: "confidence",
    emotionConfidence: 0.87,
    category: "breakthrough-days"
  },
  
  // Growth moments messages
  {
    content: "Learning to be more patient with myself. Growth takes time and I'm starting to accept that.",
    emotion: "acceptance",
    emotionConfidence: 0.83,
    category: "growth-moments"
  },
  {
    content: "Started meditating daily. It's helping me become more mindful and present in my relationships.",
    emotion: "peace",
    emotionConfidence: 0.86,
    category: "growth-moments"
  },
  {
    content: "Apologized to my friend for my mistake. It was hard but it strengthened our friendship.",
    emotion: "humility",
    emotionConfidence: 0.84,
    category: "growth-moments"
  },
  
  // Heart to hearts messages
  {
    content: "Had a deep conversation with my partner about our future together. We're more aligned than ever.",
    emotion: "love",
    emotionConfidence: 0.93,
    category: "heart-to-hearts"
  },
  {
    content: "My grandmother shared stories about her childhood today. I felt so connected to my family history.",
    emotion: "connection",
    emotionConfidence: 0.90,
    category: "heart-to-hearts"
  },
  {
    content: "Opened up to my therapist about my childhood trauma. It was painful but healing at the same time.",
    emotion: "vulnerability",
    emotionConfidence: 0.88,
    category: "heart-to-hearts"
  }
];

async function addDummyData() {
  console.log('🚀 Adding dummy data for journey messages testing...\n');
  
  try {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      console.log('❌ User not found!');
      return;
    }
    
    console.log(`✅ User found: ${user.email}`);
    
    // Create chats for different categories
    const chatTypes = ['PERSONAL_AI', 'ASSISTANT'];
    const chatNames = ['Personal Journey Chat', 'Goal Achievement Chat', 'Reflection Chat', 'Growth Chat'];
    const chats = [];
    
    for (let i = 0; i < 4; i++) {
      const chat = await prisma.chat.create({
        data: {
          userId,
          name: chatNames[i],
          type: chatTypes[i % 2], // Alternate between PERSONAL_AI and ASSISTANT
          isDeleted: false
        }
      });
      chats.push(chat);
      console.log(`📝 Created chat: ${chat.name} (${chat.type})`);
    }
    
    // Add messages to chats
    const messages = [];
    let messageCount = 0;
    
    for (const msgData of emotionalMessages) {
      const chatIndex = messageCount % chats.length;
      const chat = chats[chatIndex];
      
      // Create user message
      const userMessage = await prisma.message.create({
        data: {
          chatId: chat.id,
          senderId: userId, // Add senderId field
          content: msgData.content,
          isFromAI: false,
          emotion: msgData.emotion,
          emotionConfidence: msgData.emotionConfidence,
          createdAt: new Date(Date.now() - (messageCount * 24 * 60 * 60 * 1000)) // Spread over days
        }
      });
      
      messages.push({ ...userMessage, category: msgData.category });
      
      // Create AI response
      const aiResponse = await prisma.message.create({
        data: {
          chatId: chat.id,
          senderId: userId, // AI messages also need senderId (using same user for simplicity)
          content: `That's wonderful to hear! Your ${msgData.emotion} really comes through in your message. Keep up the great work!`,
          isFromAI: true,
          emotion: "supportive",
          emotionConfidence: 0.75,
          createdAt: new Date(Date.now() - (messageCount * 24 * 60 * 60 * 1000) + 60000) // 1 minute later
        }
      });
      
      messageCount++;
      console.log(`💬 Added message: "${msgData.content.substring(0, 50)}..." (${msgData.emotion})`);
    }
    
    // Add messages to favorites (required for journey messages)
    console.log('\n⭐ Adding messages to favorites...');
    let favoriteCount = 0;
    
    for (const message of messages) {
      // Add all user messages to favorites for testing
      await prisma.userMessageFavorite.create({
        data: {
          userId,
          messageId: message.id,
          createdAt: message.createdAt
        }
      });
      favoriteCount++;
      console.log(`⭐ Added to favorites: ${message.category} message`);
    }
    
    console.log(`\n✅ Successfully added dummy data:`);
    console.log(`   📝 ${chats.length} chats created`);
    console.log(`   💬 ${messageCount * 2} messages created (${messageCount} user + ${messageCount} AI)`);
    console.log(`   ⭐ ${favoriteCount} favorites created`);
    console.log(`   😊 ${messageCount} messages with emotions`);
    
    // Test the journey messages endpoint
    console.log('\n🧪 Testing journey messages endpoint...');
    
    const categories = ['goals-achieved', 'breakthrough-days', 'growth-moments', 'heart-to-hearts'];
    
    for (const category of categories) {
      const count = messages.filter(m => m.category === category).length;
      console.log(`   📂 ${category}: ${count} messages available`);
    }
    
    console.log('\n🎉 Dummy data added successfully! You can now test the journey messages endpoints.');
    
  } catch (error) {
    console.error('❌ Error adding dummy data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Function to clean up dummy data
async function cleanupDummyData() {
  console.log('🧹 Cleaning up dummy data...\n');
  
  try {
    // Delete favorites
    const deletedFavorites = await prisma.userMessageFavorite.deleteMany({
      where: { userId }
    });
    console.log(`🗑️  Deleted ${deletedFavorites.count} favorites`);
    
    // Delete messages
    const deletedMessages = await prisma.message.deleteMany({
      where: {
        chat: { userId }
      }
    });
    console.log(`🗑️  Deleted ${deletedMessages.count} messages`);
    
    // Delete chats
    const deletedChats = await prisma.chat.deleteMany({
      where: { userId }
    });
    console.log(`🗑️  Deleted ${deletedChats.count} chats`);
    
    console.log('\n✅ Cleanup completed!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run based on command line argument
if (require.main === module) {
  const action = process.argv[2];
  
  if (action === 'cleanup') {
    cleanupDummyData().catch(console.error);
  } else {
    addDummyData().catch(console.error);
  }
}

module.exports = { addDummyData, cleanupDummyData };