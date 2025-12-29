/**
 * Analyze the live user's data issue in detail
 */

const axios = require('axios');

const LIVE_BASE_URL = 'https://pryve-backend.projectco.space/api/v1';
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtamsxcWUxZzAwMDBwZWN1aTR2c2U3dGQiLCJyb2xlIjoiQ0xJRU5UIiwiaWF0IjoxNzY3MDEyNTAzLCJleHAiOjE3Njc2MTQxMjF9.MteQhI3sDymZLZ09TZE3a7U7Wif72B9Gbz5FymtLll0';

const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};

async function analyzeLiveUserIssue() {
  console.log('🔍 Analyzing Live User Journey Issue\n');
  
  try {
    // Get journey data to see what the user has
    console.log('1️⃣ Getting Journey Overview:');
    const journeyResponse = await axios.get(`${LIVE_BASE_URL}/journey`, { headers });
    const journeyData = journeyResponse.data.data;
    
    console.log('📊 Statistics:', JSON.stringify(journeyData.statistics, null, 2));
    console.log(`📊 Recent Chats: ${journeyData.recentChats?.length || 0}`);
    console.log(`📊 Recent Goals: ${journeyData.recentGoals?.length || 0}`);
    
    if (journeyData.recentChats?.length > 0) {
      console.log('\n💬 Recent Chats:');
      journeyData.recentChats.forEach((chat, index) => {
        console.log(`   ${index + 1}. ${chat.name} (${chat.type}) - ${chat.messageCount} messages`);
      });
    }
    
    // The key insight: Statistics show growth moments exist, but journey messages return empty
    console.log('\n🔍 Key Issue Analysis:');
    console.log(`   Statistics show: ${journeyData.statistics.growthMoments} growth moments`);
    console.log(`   But /journey/messages returns: 0 items`);
    console.log('   This means the data exists but doesn\'t meet journey message criteria');
    
    // Test getting user chats to see messages
    console.log('\n2️⃣ Getting User Chats:');
    try {
      const chatsResponse = await axios.get(`${LIVE_BASE_URL}/chats`, { headers });
      const chats = chatsResponse.data.data || chatsResponse.data;
      
      console.log(`📊 Total Chats: ${chats.length}`);
      
      if (chats.length > 0) {
        // Get messages from the first chat
        const firstChat = chats[0];
        console.log(`\n💬 Checking messages in chat: ${firstChat.name || firstChat.id}`);
        
        try {
          const messagesResponse = await axios.get(
            `${LIVE_BASE_URL}/chats/${firstChat.id}/messages?limit=20`, 
            { headers }
          );
          const messages = messagesResponse.data.data || messagesResponse.data;
          
          console.log(`📊 Total Messages in Chat: ${messages.length}`);
          
          if (messages.length > 0) {
            console.log('\n📋 Message Analysis:');
            messages.forEach((msg, index) => {
              console.log(`\n   ${index + 1}. ${msg.isFromAI ? 'AI' : 'USER'}: "${msg.content?.substring(0, 60)}..."`);
              console.log(`      Emotion: ${msg.emotion || 'NONE'} (${msg.emotionConfidence || 'N/A'})`);
              console.log(`      Created: ${msg.createdAt}`);
            });
            
            // Count message types
            const userMessages = messages.filter(m => !m.isFromAI);
            const aiMessages = messages.filter(m => m.isFromAI);
            const emotionalMessages = messages.filter(m => m.emotion && !m.isFromAI);
            
            console.log('\n📊 Message Breakdown:');
            console.log(`   User Messages: ${userMessages.length}`);
            console.log(`   AI Messages: ${aiMessages.length}`);
            console.log(`   User Messages with Emotions: ${emotionalMessages.length}`);
          }
        } catch (error) {
          console.log(`❌ Error getting messages: ${error.response?.data?.message || error.message}`);
        }
      }
    } catch (error) {
      console.log(`❌ Error getting chats: ${error.response?.data?.message || error.message}`);
    }
    
    // Test favorites endpoint
    console.log('\n3️⃣ Getting Favorite Messages:');
    try {
      const favoritesResponse = await axios.get(`${LIVE_BASE_URL}/chats/favorites/messages`, { headers });
      const favorites = favoritesResponse.data.data || favoritesResponse.data;
      
      console.log(`📊 Total Favorites: ${favorites.length}`);
      
      if (favorites.length > 0) {
        console.log('\n⭐ Favorite Messages Analysis:');
        favorites.forEach((fav, index) => {
          console.log(`\n   ${index + 1}. ${fav.isFromAI ? 'AI' : 'USER'}: "${fav.content?.substring(0, 60)}..."`);
          console.log(`      Emotion: ${fav.emotion || 'NONE'} (${fav.emotionConfidence || 'N/A'})`);
          console.log(`      Chat: ${fav.chatName || 'Unknown'}`);
        });
        
        // Analyze favorites
        const userFavorites = favorites.filter(f => !f.isFromAI);
        const aiFavorites = favorites.filter(f => f.isFromAI);
        const emotionalUserFavorites = favorites.filter(f => !f.isFromAI && f.emotion);
        
        console.log('\n📊 Favorites Breakdown:');
        console.log(`   User Message Favorites: ${userFavorites.length}`);
        console.log(`   AI Message Favorites: ${aiFavorites.length}`);
        console.log(`   User Favorites with Emotions: ${emotionalUserFavorites.length}`);
        
        console.log('\n🎯 Journey Message Requirements:');
        console.log('   ✅ Must be favorited');
        console.log('   ✅ Must be user message (not AI)');
        console.log('   ✅ Must have emotion data');
        console.log(`   📊 Messages meeting ALL criteria: ${emotionalUserFavorites.length}`);
        
        if (emotionalUserFavorites.length === 0) {
          console.log('\n❌ ROOT CAUSE IDENTIFIED:');
          if (userFavorites.length === 0) {
            console.log('   🔸 All favorites are AI messages');
            console.log('   🔸 Need to favorite USER messages instead');
          } else {
            console.log('   🔸 User favorites exist but lack emotion data');
            console.log('   🔸 Need emotion processing on favorited user messages');
          }
        }
      }
    } catch (error) {
      console.log(`❌ Error getting favorites: ${error.response?.data?.message || error.message}`);
    }
    
    // Provide solution
    console.log('\n💡 SOLUTION RECOMMENDATIONS:');
    console.log('1. Check if user has favorited any USER messages (not AI messages)');
    console.log('2. Ensure favorited user messages have emotion analysis');
    console.log('3. If missing, either:');
    console.log('   - Add emotions to existing user favorites, OR');
    console.log('   - Favorite existing emotional user messages');
    
  } catch (error) {
    console.error('❌ Error analyzing live user:', error.response?.data || error.message);
  }
}

// Run the analysis
if (require.main === module) {
  analyzeLiveUserIssue().catch(console.error);
}

module.exports = { analyzeLiveUserIssue };