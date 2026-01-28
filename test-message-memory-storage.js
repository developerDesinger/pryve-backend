const https = require('https');

// Your JWT token
const YOUR_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtanBqN2IxdzAwMGhwZWp0b2R6cDN2YjUiLCJyb2xlIjoiQ0xJRU5UIiwiaWF0IjoxNzY5NTMwNDA2LCJleHAiOjE3NzAxMzUyMDZ9.YL9ecIiGK6kTLdEJEIcZOef_I8XB02laaKP37tqd7Mk';

// Live server configuration
const BASE_URL = 'https://pryve-backend.projectco.space';

function makeRequest(url, token, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Test-Message-Memory/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: jsonData,
            raw: data
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: null,
            raw: data,
            parseError: error.message
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Request timeout (15s)'));
    });
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function testMessageMemoryStorage() {
  console.log('🧠 Testing Message Memory/Vector Storage');
  console.log('=' .repeat(60));
  console.log(`🌐 Server: ${BASE_URL}`);
  console.log(`🔑 Token: ${YOUR_TOKEN.substring(0, 20)}...`);
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Get user chats to find a chat to work with
    console.log('\n1️⃣ Getting User Chats');
    console.log('-'.repeat(40));
    
    const chatsResult = await makeRequest(`${BASE_URL}/api/v1/chats`, YOUR_TOKEN);
    console.log(`📊 Status: ${chatsResult.status}`);
    
    let chatId = null;
    
    if (chatsResult.status === 200) {
      const chats = chatsResult.data.data || [];
      console.log(`✅ Found ${chats.length} chats`);
      
      if (chats.length > 0) {
        chatId = chats[0].id;
        console.log(`📝 Using chat: ${chatId} (${chats[0].name})`);
      }
    }
    
    if (!chatId) {
      console.log('❌ No chats found. Creating one...');
      
      const createChatResult = await makeRequest(
        `${BASE_URL}/api/v1/chats`, 
        YOUR_TOKEN, 
        'POST', 
        {
          name: 'Memory Storage Test Chat',
          description: 'Testing if messages go to vector memory'
        }
      );
      
      if (createChatResult.status === 200 || createChatResult.status === 201) {
        chatId = createChatResult.data.data?.id || createChatResult.data.id;
        console.log(`✅ Created chat: ${chatId}`);
      } else {
        console.log(`❌ Failed to create chat: ${createChatResult.raw}`);
        return;
      }
    }
    
    // Step 2: Send a test message and check what happens
    console.log('\n2️⃣ Sending Test Message');
    console.log('-'.repeat(40));
    
    const testMessage = "This is a test message to check if it gets stored in vector memory. I want to understand how the system remembers our conversations and uses them for context in future interactions.";
    
    console.log(`📤 Sending: ${testMessage.substring(0, 80)}...`);
    
    const messageResult = await makeRequest(
      `${BASE_URL}/api/v1/chats/${chatId}/messages`,
      YOUR_TOKEN,
      'POST',
      {
        content: testMessage,
        role: 'user'
      }
    );
    
    console.log(`📊 Status: ${messageResult.status}`);
    
    if (messageResult.status === 200) {
      console.log('✅ Message sent successfully');
      
      const userMessage = messageResult.data.data?.userMessage;
      const aiResponse = messageResult.data.data?.aiResponse;
      
      if (userMessage) {
        console.log(`📝 User Message ID: ${userMessage.id}`);
        console.log(`📝 User Message Content: ${userMessage.content?.substring(0, 100)}...`);
      }
      
      if (aiResponse) {
        console.log(`🤖 AI Response ID: ${aiResponse.id}`);
        console.log(`🤖 AI Response Content: ${aiResponse.content?.substring(0, 100)}...`);
      }
    } else {
      console.log(`❌ Failed to send message: ${messageResult.raw}`);
      return;
    }
    
    // Step 3: Check if messages are retrievable from chat history
    console.log('\n3️⃣ Checking Chat History');
    console.log('-'.repeat(40));
    
    const historyResult = await makeRequest(
      `${BASE_URL}/api/v1/chats/${chatId}/messages?limit=10`,
      YOUR_TOKEN
    );
    
    console.log(`📊 Status: ${historyResult.status}`);
    
    if (historyResult.status === 200) {
      const messages = historyResult.data.data?.messages || historyResult.data.messages || [];
      console.log(`✅ Found ${messages.length} messages in chat history`);
      
      if (messages.length > 0) {
        console.log('\n📋 Recent Messages:');
        messages.slice(0, 5).forEach((msg, index) => {
          console.log(`${index + 1}. [${msg.isFromAI ? 'AI' : 'USER'}] ${msg.content?.substring(0, 80)}...`);
          console.log(`   ID: ${msg.id}, Created: ${msg.createdAt}`);
          if (msg.emotion) {
            console.log(`   Emotion: ${msg.emotion} (${msg.emotionConfidence})`);
          }
        });
      }
    } else {
      console.log(`❌ Failed to get chat history: ${historyResult.raw}`);
    }
    
    // Step 4: Test if the system can reference previous messages in context
    console.log('\n4️⃣ Testing Contextual Memory');
    console.log('-'.repeat(40));
    
    const contextTestMessage = "Can you remember what I just said in my previous message? Please reference it specifically.";
    
    console.log(`📤 Sending context test: ${contextTestMessage}`);
    
    const contextResult = await makeRequest(
      `${BASE_URL}/api/v1/chats/${chatId}/messages`,
      YOUR_TOKEN,
      'POST',
      {
        content: contextTestMessage,
        role: 'user'
      }
    );
    
    console.log(`📊 Status: ${contextResult.status}`);
    
    if (contextResult.status === 200) {
      const aiResponse = contextResult.data.data?.aiResponse;
      
      if (aiResponse) {
        console.log('✅ AI Response received');
        console.log(`🤖 Response: ${aiResponse.content?.substring(0, 200)}...`);
        
        // Check if AI referenced the previous message
        const referencesMemory = aiResponse.content?.toLowerCase().includes('test message') ||
                                aiResponse.content?.toLowerCase().includes('vector memory') ||
                                aiResponse.content?.toLowerCase().includes('previous message') ||
                                aiResponse.content?.toLowerCase().includes('you said') ||
                                aiResponse.content?.toLowerCase().includes('you mentioned');
        
        if (referencesMemory) {
          console.log('✅ AI SUCCESSFULLY referenced previous message - Memory is working!');
        } else {
          console.log('⚠️  AI did not clearly reference previous message - Memory might not be working');
        }
      }
    } else {
      console.log(`❌ Failed to send context test: ${contextResult.raw}`);
    }
    
    // Step 5: Check if there are any vector/memory endpoints
    console.log('\n5️⃣ Checking for Vector/Memory Endpoints');
    console.log('-'.repeat(40));
    
    const memoryEndpoints = [
      '/api/v1/memory',
      '/api/v1/vector',
      '/api/v1/embeddings',
      '/api/v1/context',
      '/api/v1/search',
      '/api/v1/chats/search',
      '/api/v1/messages/search'
    ];
    
    for (const endpoint of memoryEndpoints) {
      console.log(`\n🔍 Testing: ${endpoint}`);
      
      try {
        const endpointResult = await makeRequest(`${BASE_URL}${endpoint}`, YOUR_TOKEN);
        console.log(`   Status: ${endpointResult.status}`);
        
        if (endpointResult.status === 200) {
          console.log(`   ✅ Endpoint exists and responds`);
          console.log(`   Data: ${JSON.stringify(endpointResult.data).substring(0, 100)}...`);
        } else if (endpointResult.status === 404) {
          console.log(`   ❌ Endpoint not found`);
        } else {
          console.log(`   ⚠️  Endpoint exists but returned: ${endpointResult.status}`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
    
    // Step 6: Check message storage details
    console.log('\n6️⃣ Analyzing Message Storage');
    console.log('-'.repeat(40));
    
    const finalHistoryResult = await makeRequest(
      `${BASE_URL}/api/v1/chats/${chatId}/messages?limit=20`,
      YOUR_TOKEN
    );
    
    if (finalHistoryResult.status === 200) {
      const messages = finalHistoryResult.data.data?.messages || finalHistoryResult.data.messages || [];
      console.log(`📊 Total messages in chat: ${messages.length}`);
      
      const userMessages = messages.filter(m => !m.isFromAI);
      const aiMessages = messages.filter(m => m.isFromAI);
      
      console.log(`👤 User messages: ${userMessages.length}`);
      console.log(`🤖 AI messages: ${aiMessages.length}`);
      
      // Check if messages have additional metadata that might indicate vector storage
      const messageWithMetadata = messages.find(m => 
        m.embedding || m.vectorId || m.memoryId || m.contextId || m.searchable
      );
      
      if (messageWithMetadata) {
        console.log('✅ Found message with vector/memory metadata:');
        console.log(`   Fields: ${Object.keys(messageWithMetadata).join(', ')}`);
      } else {
        console.log('⚠️  No obvious vector/memory metadata found in messages');
      }
      
      // Check message structure
      if (messages.length > 0) {
        console.log('\n📋 Message Structure Analysis:');
        const sampleMessage = messages[0];
        console.log(`   Available fields: ${Object.keys(sampleMessage).join(', ')}`);
        
        // Look for fields that might indicate memory storage
        const memoryFields = Object.keys(sampleMessage).filter(key => 
          key.toLowerCase().includes('vector') ||
          key.toLowerCase().includes('embedding') ||
          key.toLowerCase().includes('memory') ||
          key.toLowerCase().includes('context') ||
          key.toLowerCase().includes('search')
        );
        
        if (memoryFields.length > 0) {
          console.log(`   🧠 Memory-related fields found: ${memoryFields.join(', ')}`);
        } else {
          console.log(`   ⚠️  No obvious memory-related fields found`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  console.log('\n✨ Message Memory Storage Test Completed!');
  console.log('\n💡 Summary:');
  console.log('   - Tested message sending and retrieval');
  console.log('   - Checked if AI can reference previous messages');
  console.log('   - Looked for vector/memory endpoints');
  console.log('   - Analyzed message storage structure');
}

// Run the test
testMessageMemoryStorage().catch(console.error);