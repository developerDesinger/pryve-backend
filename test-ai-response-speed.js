/**
 * AI Response Speed Test
 * Tests how fast AI responses are generated
 */

const https = require('https');

// Update with a fresh token
const TOKEN = 'PASTE_FRESH_TOKEN_HERE';
const BASE_URL = 'https://pryve-backend.projectco.space/api/v1';

function makeRequest(url, method, data, token) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = data ? JSON.stringify(data) : null;
    
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Speed-Test/1.0'
      }
    };

    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

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
    
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout (30s)'));
    });
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

async function testAIResponseSpeed() {
  console.log('🚀 AI Response Speed Test');
  console.log('=' .repeat(60));
  
  if (TOKEN === 'PASTE_FRESH_TOKEN_HERE') {
    console.log('❌ ERROR: Please update the TOKEN variable with a fresh token!');
    return;
  }

  try {
    // Step 1: Create a test chat
    console.log('\n1️⃣ Creating test chat...');
    const startTime = Date.now();
    
    const createChatResult = await makeRequest(
      `${BASE_URL}/chats`,
      'POST',
      {
        name: 'Speed Test Chat',
        description: 'Testing AI response speed'
      },
      TOKEN
    );
    
    const chatCreateTime = Date.now() - startTime;
    console.log(`✅ Chat created in ${chatCreateTime}ms`);
    
    if (createChatResult.status !== 201) {
      console.log('❌ Failed to create chat:', createChatResult.raw);
      return;
    }
    
    const chatId = createChatResult.data.chat.id;
    console.log(`📝 Chat ID: ${chatId}`);
    
    // Step 2: Test different message types for speed
    const testMessages = [
      {
        name: 'Simple Question',
        content: 'Hi, how are you?',
        expectedSpeed: '< 2 seconds'
      },
      {
        name: 'Complex Question',
        content: 'Can you help me understand the difference between anxiety and stress, and provide some coping strategies?',
        expectedSpeed: '< 5 seconds'
      },
      {
        name: 'Short Response Request',
        content: 'Give me one word of encouragement.',
        expectedSpeed: '< 1 second'
      }
    ];
    
    console.log('\n2️⃣ Testing AI Response Speeds...');
    console.log('-'.repeat(60));
    
    for (let i = 0; i < testMessages.length; i++) {
      const test = testMessages[i];
      console.log(`\n📝 Test ${i + 1}: ${test.name}`);
      console.log(`💬 Message: "${test.content}"`);
      console.log(`🎯 Expected: ${test.expectedSpeed}`);
      
      const messageStartTime = Date.now();
      
      const messageResult = await makeRequest(
        `${BASE_URL}/chats/${chatId}/messages`,
        'POST',
        { content: test.content },
        TOKEN
      );
      
      const totalTime = Date.now() - messageStartTime;
      
      if (messageResult.status === 200 || messageResult.status === 201) {
        const aiResponse = messageResult.data.data.aiResponse;
        const processingTime = aiResponse?.processingTime || 0;
        const tokensUsed = aiResponse?.tokensUsed || 0;
        
        console.log(`✅ SUCCESS`);
        console.log(`⏱️  Total Time: ${totalTime}ms`);
        console.log(`🤖 AI Processing: ${processingTime}ms`);
        console.log(`🔢 Tokens Used: ${tokensUsed}`);
        console.log(`📊 Network + DB: ${totalTime - processingTime}ms`);
        
        // Speed analysis
        if (totalTime < 1000) {
          console.log(`🚀 EXCELLENT - Under 1 second!`);
        } else if (totalTime < 3000) {
          console.log(`✅ GOOD - Under 3 seconds`);
        } else if (totalTime < 5000) {
          console.log(`⚠️  ACCEPTABLE - Under 5 seconds`);
        } else {
          console.log(`❌ SLOW - Over 5 seconds`);
        }
        
        // Show first 100 chars of response
        const responsePreview = aiResponse?.content?.substring(0, 100) || 'No response';
        console.log(`💭 Response: "${responsePreview}${aiResponse?.content?.length > 100 ? '...' : ''}"`);
        
      } else {
        console.log(`❌ FAILED (${messageResult.status})`);
        console.log(`📊 Response: ${messageResult.raw}`);
      }
      
      // Wait 2 seconds between tests
      if (i < testMessages.length - 1) {
        console.log('⏳ Waiting 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Step 3: Test streaming endpoint if available
    console.log('\n3️⃣ Testing Streaming Response (if available)...');
    console.log('-'.repeat(60));
    
    // Note: Streaming test would require different implementation
    // For now, just mention it
    console.log('💡 Streaming endpoint would be tested separately');
    console.log('   Streaming provides perceived faster responses');
    console.log('   Users see text appearing in real-time');
    
    console.log('\n4️⃣ Speed Optimization Recommendations');
    console.log('=' .repeat(60));
    console.log('🚀 IMMEDIATE WINS:');
    console.log('   1. Use streaming endpoint for better UX');
    console.log('   2. Cache common responses');
    console.log('   3. Reduce system prompt length');
    console.log('   4. Use faster AI models for simple queries');
    console.log('');
    console.log('⚡ ADVANCED OPTIMIZATIONS:');
    console.log('   1. Parallel processing of non-critical operations');
    console.log('   2. Connection pooling');
    console.log('   3. CDN for static responses');
    console.log('   4. Response compression');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Instructions
console.log('📋 AI RESPONSE SPEED TEST');
console.log('=' .repeat(60));
console.log('🔧 SETUP:');
console.log('1. Get a fresh JWT token from login');
console.log('2. Update TOKEN variable above');
console.log('3. Run: node test-ai-response-speed.js');
console.log('=' .repeat(60));

if (require.main === module) {
  testAIResponseSpeed().catch(console.error);
}