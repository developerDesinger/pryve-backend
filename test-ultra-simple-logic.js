/**
 * Test Ultra-Simplified Journey Statistics Logic
 * The simplest possible criteria for maximum user achievement
 */

// Mock data
const mockFavorites = [
  {
    message: {
      id: 'msg1',
      content: 'I achieved my goal today!',
      emotion: 'joy',
      createdAt: new Date('2024-01-15T10:00:00Z'),
      chat: { id: 'chat1', name: 'Personal' }
    }
  },
  {
    message: {
      id: 'msg2', 
      content: 'Feeling happy and grateful.',
      emotion: 'gratitude',
      createdAt: new Date('2024-01-15T11:00:00Z'),
      chat: { id: 'chat1', name: 'Personal' }
    }
  },
  {
    message: {
      id: 'msg3',
      content: 'Great success with my project!',
      emotion: 'excitement',
      createdAt: new Date('2024-01-16T12:00:00Z'),
      chat: { id: 'chat2', name: 'Work' }
    }
  }
];

// Ultra-simplified goal detection
function deriveGoalsFromActivity(messages) {
  const goalKeywords = ['goal', 'achieve', 'success', 'complete', 'finish', 'accomplish'];
  
  return messages.filter(msg => {
    const content = (msg.content || '').toLowerCase();
    return goalKeywords.some(keyword => content.includes(keyword));
  }).map((msg, index) => ({
    id: `goal_${index}`,
    title: "Achievement",
    summary: msg.content.substring(0, 50) + '...',
    themes: ["Success"],
    startedAt: msg.createdAt,
    completedAt: msg.createdAt,
    highlight: msg,
  }));
}

function testUltraSimpleLogic() {
  console.log('🚀 Testing ULTRA-SIMPLIFIED Journey Statistics');
  console.log('=' .repeat(60));

  const favoritedMessages = mockFavorites.map(fav => fav.message);

  console.log('📊 Test Data:');
  console.log(`   Favorited Messages: ${favoritedMessages.length}`);

  // 1. Heart to Hearts = Number of unique chats with favorites
  console.log('\n💝 Heart to Hearts (ULTRA SIMPLE)');
  console.log('-'.repeat(40));
  
  const chatsWithFavorites = new Set();
  favoritedMessages.forEach(msg => {
    if (msg.chat?.id) {
      chatsWithFavorites.add(msg.chat.id);
    }
  });
  const heartToHearts = chatsWithFavorites.size;
  
  console.log(`✅ Heart to Hearts: ${heartToHearts}`);
  console.log('   Logic: Count unique chats with ANY favorited message');

  // 2. Growth Moments = Count of favorited messages with any emotion
  console.log('\n🌱 Growth Moments (ULTRA SIMPLE)');
  console.log('-'.repeat(40));
  
  const growthMomentsCount = favoritedMessages.filter(msg => msg.emotion).length;
  
  console.log(`✅ Growth Moments: ${growthMomentsCount}`);
  console.log('   Logic: Count favorited messages with ANY emotion');

  // 3. Goals Achieved = Messages with goal keywords
  console.log('\n🎯 Goals Achieved (ULTRA SIMPLE)');
  console.log('-'.repeat(40));
  
  const goals = deriveGoalsFromActivity(favoritedMessages);
  
  console.log(`✅ Goals Achieved: ${goals.length}`);
  console.log('   Logic: Count messages with goal keywords');
  goals.forEach(goal => {
    console.log(`   🏆 "${goal.summary}"`);
  });

  // 4. Breakthrough Days = Count of unique days with favorites
  console.log('\n💡 Breakthrough Days (ULTRA SIMPLE)');
  console.log('-'.repeat(40));
  
  const daysWithFavorites = new Set();
  favoritedMessages.forEach(msg => {
    const dateKey = new Date(msg.createdAt).toISOString().split("T")[0];
    daysWithFavorites.add(dateKey);
  });
  const breakthroughDays = daysWithFavorites.size;
  
  console.log(`✅ Breakthrough Days: ${breakthroughDays}`);
  console.log('   Logic: Count unique days with ANY favorited message');

  console.log('\n📋 ULTRA-SIMPLIFIED CRITERIA SUMMARY');
  console.log('=' .repeat(60));
  console.log('💝 Heart to Hearts: Any chat with 1+ favorited message');
  console.log('🌱 Growth Moments: Any favorited message with emotion');
  console.log('🎯 Goals Achieved: Any message with goal keywords');
  console.log('💡 Breakthrough Days: Any day with favorited messages');
  
  console.log('\n🎉 MAXIMUM SIMPLICITY ACHIEVED!');
  console.log('   Users just need to FAVORITE messages to get all stats!');

  return {
    heartToHearts,
    growthMomentsCount,
    goalsAchieved: goals.length,
    breakthroughDays
  };
}

// Run test
if (require.main === module) {
  testUltraSimpleLogic();
}

module.exports = { testUltraSimpleLogic };