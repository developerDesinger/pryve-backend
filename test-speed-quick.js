/**
 * Quick Speed Test - Test AI Response Optimizations
 * 
 * INSTRUCTIONS:
 * 1. Get a fresh token from your login
 * 2. Update TOKEN below
 * 3. Run: node test-speed-quick.js
 */

const https = require('https');

// 🔧 UPDATE THIS TOKEN WITH A FRESH ONE
const TOKEN = 'PASTE_YOUR_FRESH_TOKEN_HERE';
const BASE_URL = 'http://localhost:3400/api/v1'; // Updated to correct port

function makeRequest(url, method, data, token) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = data ? JSON.stringify(data) : null;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
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

    const protocol = urlObj.protocol === 'https:' ? https : require('http');
    const req = protocol.request(options, (res) => {
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
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

async function testSpeedOptimizations() {
  console.log('🚀 Quick Speed Optimization Test');
  console.log('=' .repeat(60));
  console.log(`🌐 Server: ${BASE_URL}`);
  console.log(`🔑 Token: ${TOKEN.substring(0, 20)}...${TOKEN.substring(TOKEN.length - 10)}`);
  console.log('=' .repeat(60));
  
  if (TOKEN === 'PASTE_YOUR_FRESH_TOKEN_HERE') {
    console.log('❌ ERROR: Please update the TOKEN variable with a fresh token!');
    console.log('💡 Steps:');
    console.log('   1. Login to your app');
    console.log('   2. Copy the JWT token');
    console.log('   3. Replace TOKEN variable above');
    console.log('   4. Run: node test-speed-quick.js');
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
        description: 'Testing AI response optimizations'
      },
      TOKEN
    );
    
    const chatCreateTime = Date.now() - startTime;
    
    if (createChatResult.status !== 201) {
      console.log('❌ Failed to create chat:', createChatResult.raw);
      if (createChatResult.status === 401) {
        console.log('💡 Token is invalid or expired - get a fresh one');
      }
      return;
    }
    
    const chatId = createChatResult.data.chat.id;
    console.log(`✅ Chat created in ${chatCreateTime}ms`);
    console.log(`📝 Chat ID: ${chatId}`);
    
    // Step 2: Test optimized queries
    const testQueries = [
      {
        name: 'Simple Greeting (Should use gpt-4o-mini + short prompt)',
        content: 'Hi',
        expectedOptimizations: ['gpt-4o-mini', 'short prompt']
      },
      {
        name: 'Short Question (Should use gpt-4o-mini + short prompt)',
        content: 'How are you?',
        expectedOptimizations: ['gpt-4o-mini', 'short prompt']
      },
      {
        name: 'Complex Question (Should use gpt-4o + full prompt)',
        content: 'Can you help me understand the difference between anxiety and stress, and provide some detailed coping strategies?',
        expectedOptimizations: ['gpt-4o', 'full prompt']
      }
    ];
    
    console.log('\n2️⃣ Testing Speed Optimizations...');
    console.log('-'.repeat(60));
    
    for (let i = 0; i < testQueries.length; i++) {
      const test = testQueries[i];
      console.log(`\n📝 Test ${i + 1}: ${test.name}`);
      console.log(`💬 Query: "${test.content}"`);
      console.log(`🎯 Expected: ${test.expectedOptimizations.join(', ')}`);
      
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
        const aiModel = aiResponse?.aiModel || 'unknown';
        
        console.log(`✅ SUCCESS`);
        console.log(`⏱️  Total Time: ${totalTime}ms`);
        console.log(`🤖 AI Processing: ${processingTime}ms`);
        console.log(`🔢 Tokens Used: ${tokensUsed}`);
        console.log(`🧠 Model Used: ${aiModel}`);
        console.log(`📊 Network + DB: ${totalTime - processingTime}ms`);
        
        // Check if optimizations worked
        if (test.content.length < 50) {
          if (aiModel === 'gpt-4o-mini') {
            console.log(`🚀 OPTIMIZATION WORKING: Using fast model for simple query!`);
          } else {
            console.log(`⚠️  Expected gpt-4o-mini but got ${aiModel}`);
          }
        }
        
        // Speed analysis
        if (totalTime < 1500) {
          console.log(`🚀 EXCELLENT - Under 1.5 seconds!`);
        } else if (totalTime < 3000) {
          console.log(`✅ GOOD - Under 3 seconds`);
        } else if (totalTime < 5000) {
          console.log(`⚠️  ACCEPTABLE - Under 5 seconds`);
        } else {
          console.log(`❌ SLOW - Over 5 seconds (may need more optimization)`);
        }
        
        // Show response preview
        const responsePreview = aiResponse?.content?.substring(0, 100) || 'No response';
        console.log(`💭 Response: "${responsePreview}${aiResponse?.content?.length > 100 ? '...' : ''}"`);
        
      } else {
        console.log(`❌ FAILED (${messageResult.status})`);
        console.log(`📊 Response: ${messageResult.raw}`);
      }
      
      // Wait 1 second between tests
      if (i < testQueries.length - 1) {
        console.log('⏳ Waiting 1 second...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('\n3️⃣ Optimization Summary');
    console.log('=' .repeat(60));
    console.log('✅ What to look for in server logs:');
    console.log('   🚀 MODEL OPTIMIZATION: Using gpt-4o-mini for query length: X chars');
    console.log('   🚀 PROMPT OPTIMIZATION: X chars vs Y chars (Z% reduction)');
    console.log('');
    console.log('✅ Expected improvements:');
    console.log('   • Simple queries: 40-60% faster');
    console.log('   • Complex queries: 20-30% faster');
    console.log('   • Lower token costs for simple queries');
    console.log('');
    console.log('🔧 If not seeing optimizations:');
    console.log('   1. Check server logs for optimization messages');
    console.log('   2. Ensure server was restarted after code changes');
    console.log('   3. Verify chat.service.js has the new optimization functions');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('💡 Make sure your server is running on localhost:3000');
  }
}

// Instructions
console.log('📋 SPEED OPTIMIZATION TEST');
console.log('=' .repeat(60));
console.log('🔧 SETUP:');
console.log('1. Make sure your server is running (npm run dev)');
console.log('2. Get a fresh JWT token from login');
console.log('3. Update TOKEN variable above');
console.log('4. Run: node test-speed-quick.js');
console.log('=' .repeat(60));

if (require.main === module) {
  testSpeedOptimizations().catch(console.error);
}