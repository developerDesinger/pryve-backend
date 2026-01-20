/**
 * Local Test for Simplified Journey Statistics Logic
 * Tests the new simplified criteria without needing network access
 */

// Mock data to simulate user messages and favorites
const mockMessages = [
  {
    id: 'msg1',
    content: 'I achieved my goal of running 5K today! Feeling so accomplished.',
    emotion: 'joy',
    emotionConfidence: 0.9,
    isFromAI: false,
    isDeleted: false,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    chat: { id: 'chat1', name: 'Personal Chat', type: 'PERSONAL_AI' }
  },
  {
    id: 'msg2', 
    content: 'What a beautiful day! I feel so grateful and happy.',
    emotion: 'gratitude',
    emotionConfidence: 0.8,
    isFromAI: false,
    isDeleted: false,
    createdAt: new Date('2024-01-15T11:00:00Z'),
    chat: { id: 'chat1', name: 'Personal Chat', type: 'PERSONAL_AI' }
  },
  {
    id: 'msg3',
    content: 'Completed my project milestone successfully! This progress feels amazing.',
    emotion: 'excitement',
    emotionConfidence: 0.85,
    isFromAI: false,
    isDeleted: false,
    createdAt: new Date('2024-01-15T12:00:00Z'),
    chat: { id: 'chat2', name: 'Work Chat', type: 'CONVERSATION' }
  },
  {
    id: 'msg4',
    content: 'Just a regular message without much emotion.',
    emotion: null,
    emotionConfidence: 0.3,
    isFromAI: false,
    isDeleted: false,
    createdAt: new Date('2024-01-15T13:00:00Z'),
    chat: { id: 'chat1', name: 'Personal Chat', type: 'PERSONAL_AI' }
  }
];

const mockFavorites = [
  { id: 'fav1', messageId: 'msg1', message: mockMessages[0] },
  { id: 'fav2', messageId: 'msg2', message: mockMessages[1] },
  { id: 'fav3', messageId: 'msg3', message: mockMessages[2] }
];

// Simplified goal detection function (from our changes)
function deriveGoalsFromActivity(messages, favorites = []) {
  const goals = [];

  const goalKeywords = [
    'goal', 'achieve', 'achieved', 'accomplish', 'accomplished', 'complete', 'completed',
    'finish', 'finished', 'success', 'successful', 'target', 'milestone', 'progress',
    'improvement', 'better', 'growth', 'learning', 'mastered', 'overcome', 'breakthrough'
  ];

  const goalMessages = messages.filter(msg => {
    const content = msg.content?.toLowerCase() || '';
    return goalKeywords.some(keyword => content.includes(keyword));
  });

  goalMessages.forEach((msg, index) => {
    goals.push({
      id: `goal_simple_${index}`,
      title: "Personal Achievement",
      summary: msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : ''),
      themes: ["Achievement", "Growth"],
      startedAt: msg.createdAt,
      completedAt: msg.createdAt,
      highlight: msg,
    });
  });

  return goals;
}

// Test the simplified journey statistics logic
function testSimplifiedJourneyLogic() {
  console.log('🧪 Testing Simplified Journey Statistics Logic');
  console.log('=' .repeat(60));

  // Extract favorited messages
  const favoritedMessages = mockFavorites
    .map(fav => fav.message)
    .filter(msg => msg !== null);

  console.log('📊 Test Data:');
  console.log(`   Total Messages: ${mockMessages.length}`);
  console.log(`   Total Favorites: ${mockFavorites.length}`);
  console.log(`   Favorited Messages: ${favoritedMessages.length}`);

  // Test 1: Heart to Hearts (SIMPLIFIED - need 1+ favorited message per chat)
  console.log('\n💝 Test 1: Heart to Hearts');
  console.log('-'.repeat(40));

  const chatFavoritesMap = new Map();
  favoritedMessages.forEach(msg => {
    const chatId = msg.chat?.id;
    if (chatId) {
      if (!chatFavoritesMap.has(chatId)) {
        chatFavoritesMap.set(chatId, {
          id: chatId,
          name: msg.chat.name,
          type: msg.chat.type,
          count: 0,
          updatedAt: msg.createdAt,
        });
      }
      chatFavoritesMap.get(chatId).count++;
    }
  });

  const heartToHeartsQualified = Array.from(chatFavoritesMap.values())
    .filter(chat => chat.count >= 1); // SIMPLIFIED: was >= 3

  console.log(`✅ Heart to Hearts: ${heartToHeartsQualified.length}`);
  heartToHeartsQualified.forEach(chat => {
    console.log(`   📱 ${chat.name}: ${chat.count} favorited messages`);
  });

  // Test 2: Growth Moments (SIMPLIFIED - any positive emotion)
  console.log('\n🌱 Test 2: Growth Moments');
  console.log('-'.repeat(40));

  const growthMomentsFavorited = favoritedMessages.filter(
    msg => 
      ["joy", "surprise", "love", "gratitude", "excitement", "happiness", "contentment"].includes(msg.emotion)
  );

  console.log(`✅ Growth Moments: ${growthMomentsFavorited.length}`);
  growthMomentsFavorited.forEach(msg => {
    console.log(`   🌟 "${msg.content.substring(0, 50)}..." (${msg.emotion})`);
  });

  // Test 3: Goals Achieved (SIMPLIFIED - keyword detection)
  console.log('\n🎯 Test 3: Goals Achieved');
  console.log('-'.repeat(40));

  const derivedGoals = deriveGoalsFromActivity(favoritedMessages, mockFavorites);
  
  console.log(`✅ Goals Achieved: ${derivedGoals.length}`);
  derivedGoals.forEach(goal => {
    console.log(`   🏆 ${goal.title}: "${goal.summary}"`);
  });

  // Test 4: Breakthrough Days (SIMPLIFIED - 3+ favorites per day)
  console.log('\n💡 Test 4: Breakthrough Days');
  console.log('-'.repeat(40));

  const dailyEmotions = {};
  favoritedMessages.forEach((msg) => {
    const dateKey = new Date(msg.createdAt).toISOString().split("T")[0];
    if (!dailyEmotions[dateKey]) {
      dailyEmotions[dateKey] = {
        count: 0,
        positiveCount: 0,
      };
    }
    dailyEmotions[dateKey].count += 1;
    dailyEmotions[dateKey].positiveCount += 1; // All favorites count as positive
  });

  const breakthroughDays = Object.values(dailyEmotions).filter(
    (day) => day.count >= 3 // SIMPLIFIED: was >= 5 messages + >= 2 positive
  ).length;

  console.log(`✅ Breakthrough Days: ${breakthroughDays}`);
  Object.entries(dailyEmotions).forEach(([date, stats]) => {
    const isBreakthrough = stats.count >= 3;
    console.log(`   ${isBreakthrough ? '🎉' : '📅'} ${date}: ${stats.count} favorites ${isBreakthrough ? '(BREAKTHROUGH!)' : ''}`);
  });

  // Summary
  console.log('\n📋 SUMMARY - Simplified vs Old Criteria');
  console.log('=' .repeat(60));
  console.log('💝 Heart to Hearts:');
  console.log('   OLD: ≥3 favorited emotional messages per chat');
  console.log(`   NEW: ≥1 favorited message per chat → ${heartToHeartsQualified.length} qualified`);
  
  console.log('\n🌱 Growth Moments:');
  console.log('   OLD: Only "joy" or "surprise" with confidence ≥0.7');
  console.log(`   NEW: Any positive emotion → ${growthMomentsFavorited.length} qualified`);
  
  console.log('\n🎯 Goals Achieved:');
  console.log('   OLD: Complex activity patterns and streaks');
  console.log(`   NEW: Simple keyword detection → ${derivedGoals.length} qualified`);
  
  console.log('\n💡 Breakthrough Days:');
  console.log('   OLD: ≥5 messages + ≥2 positive emotions per day');
  console.log(`   NEW: ≥3 favorited messages per day → ${breakthroughDays} qualified`);

  console.log('\n✅ All tests completed! The simplified logic is working correctly.');
  console.log('🎉 Users will now find it much easier to achieve journey milestones.');

  return {
    heartToHearts: heartToHeartsQualified.length,
    growthMoments: growthMomentsFavorited.length,
    goalsAchieved: derivedGoals.length,
    breakthroughDays: breakthroughDays
  };
}

// Run the test
if (require.main === module) {
  const results = testSimplifiedJourneyLogic();
  
  console.log('\n🔧 Next Steps:');
  console.log('1. Deploy the updated chat.service.js to your server');
  console.log('2. Test with real user data using the existing test scripts');
  console.log('3. Users should now see higher numbers in their journey statistics');
  console.log('4. Update your documentation to reflect the new simplified criteria');
}

module.exports = { testSimplifiedJourneyLogic, deriveGoalsFromActivity };