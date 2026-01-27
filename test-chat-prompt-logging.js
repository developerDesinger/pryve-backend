const ChatService = require('./src/api/v1/services/chat.service');

async function testChatPromptLogging() {
  try {
    console.log("🧪 TESTING CHAT PROMPT LOGGING");
    console.log("This will show you the console output when chat endpoints are called\n");
    
    // Test 1: Create a chat (this will show prompt logging)
    console.log("1️⃣ Testing Chat Creation (will show prompt logging):");
    
    const testUserId = "test-user-123";
    const chatData = {
      name: "Test Chat for Prompt Logging",
      description: "Testing prompt logging functionality",
      aiModel: "gpt-3.5-turbo",
      systemPrompt: "You are Pryve AI, a supportive mental health companion.",
      temperature: 0.7
    };
    
    // This will trigger the console logging we added
    const chatResult = await ChatService.createChat(testUserId, chatData);
    
    if (chatResult.success) {
      console.log("✅ Chat created successfully!");
      console.log("Chat ID:", chatResult.data.id);
      
      // Test 2: Send a message (this will show enhanced prompt logging)
      console.log("\n2️⃣ Testing Send Message (will show enhanced prompt logging):");
      
      const messageData = {
        content: "I'm feeling anxious about work today. Can you help me?",
        replyToId: null
      };
      
      // This will trigger the enhanced prompt logging we added
      const messageResult = await ChatService.sendMessage(
        chatResult.data.id, 
        testUserId, 
        messageData
      );
      
      if (messageResult.success) {
        console.log("✅ Message sent successfully!");
        console.log("Message ID:", messageResult.data.userMessage.id);
      } else {
        console.log("❌ Message failed:", messageResult.message);
      }
      
      // Clean up - delete the test chat
      await ChatService.deleteChat(chatResult.data.id, testUserId);
      console.log("🧹 Test chat cleaned up");
      
    } else {
      console.log("❌ Chat creation failed:", chatResult.message);
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  } finally {
    console.log("\n✅ Test completed. Check the console output above to see the prompt logging!");
    process.exit(0);
  }
}

console.log("🚀 Starting Chat Prompt Logging Test...\n");
testChatPromptLogging();