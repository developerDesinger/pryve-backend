/**
 * Test Speed Optimizations with Existing Token
 * Uses one of the existing tokens from your test files
 */

const https = require('https');
const http = require('http');

// Try with existing tokens from your test files
const EXISTING_TOKENS = [
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtZ2dxbmx2ajAwMDB1amRnZWJxdGR6dnYiLCJyb2xlIjoiQ0xJRU5UIiwiaWF0IjoxNzY2NjUwOTIwLCJleHAiOjE3NjcyNTU3MjB9.qK_sk_MDN6WbX7klt-cNv2tAD32TdMu2W9ILIVrIknM',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtamsxcWUxZzAwMDBwZWN1aTR2c2U3dGQiLCJyb2xlIjoiQ0xJRU5UIiwiaWF0IjoxNzY3ODUwMzQ3LCJleHAiOjE3Njg0NTUxNDd9.7BF8I4WOpn7BzWlAjTIMmlBP-JiMfMuHjp6Ki_YmPuE'
];

const BASE_URL = 'http://localhost:3400/api/v1';

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

    const protocol = urlObj.protocol === 'https:' ? https : http;
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
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout (10s)'));
    });
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

async function testWithExistingToken() {
  console.log('🔑 Testing Speed Optimizations with Existing Tokens');
  console.log('=' .repeat(60));
  console.log(`🌐 Server: ${BASE_URL}`);
  
  let workingToken = null;
  let workingUserId = null;
  
  // Try each existing token to find one that works
  console.log('\n1️⃣ Finding a working token...');
  for (let i = 0; i < EXISTING_TOKENS.length; i++) {
    const token = EXISTING_TOKENS[i];
    console.log(`\n🔍 Testing token ${i + 1}...`);
    console.log(`🔑 Token: ${token.substring(0, 20)}...${token.substring(token.length - 10)}`);
    
    try {
      // Test token by getting user info
      const userResult = await makeRequest(
        `${BASE_URL}/users/user-by-token`,
        'GET',
        null,
        token
      );
      
      if (userResult.status === 200) {
        console.log('✅ Token is valid!');
        workingToken = token;
        workingUserId = userResult.data.data?.id || userResult.data.user?.id;
        console.log(`👤 User ID: ${workingUserId}`);
        break;
      } else {
        console.log(`❌ Token invalid (${userResult.status}): ${userResult.data?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`❌ Token test failed: ${error.message}`);
    }
  }
  
  if (!workingToken) {
    console.log('\n❌ No working tokens found.');
    console.log('💡 All existing tokens are expired. You need to:');
    console.log('   1. Login to your app manually');
    console.log('   2. Copy the JWT token from browser dev tools');
    console.log('   3. Update one of the test files with the new token');
    return;
  }
  
  console.log('\n2️⃣ Creating test chat...');
  const createChatResult = await makeRequest(
    `${BASE_URL}/chats`,
    'POST',
    {
      name: 'Speed Optimization Test',
      description: 'Testing AI response speed optimizations'
    },
    workingToken
  );
  
  if (createChatResult.status !== 201) {
    console.log('❌ Failed to create chat:', createChatResult.raw);
    return;
  }
  
  const chatId = createChatResult.data.chat.id;
  console.log(`✅ Chat created: ${chatId}`);
  
  // Test the speed optimizations
  const testQueries = [
    {
      name: 'Simple Greeting (Should use gpt-4o-mini)',
      content: 'Hi',
      expectedModel: 'gpt-4o-mini'
    },
    {
      name: 'Short Question (Should use gpt-4o-mini)',
      content: 'How are you?',
      expectedModel: 'gpt-4o-mini'
    },
    {
      name: 'Complex Question (Should use gpt-4o)',
      content: 'Can you help me understand the difference between anxiety and stress, and provide detailed coping strategies with examples?',
      expectedModel: 'gpt-4o'
    }
  ];
  
  console.log('\n3️⃣ Testing Speed Optimizations...');
  console.log('=' .repeat(60));
  
  for (let i = 0; i < testQueries.length; i++) {
    const test = testQueries[i];
    console.log(`\n📝 Test ${i + 1}: ${test.name}`);
    console.log(`💬 Query: "${test.content}"`);
    console.log(`🎯 Expected Model: ${test.expectedModel}`);
    
    const startTime = Date.now();
    
    try {
      const messageResult = await makeRequest(
        `${BASE_URL}/chats/${chatId}/messages`,
        'POST',
        { content: test.content },
        workingToken
      );
      
      const totalTime = Date.now() - startTime;
      
      if (messageResult.status === 200 || messageResult.status === 201) {
        const aiResponse = messageResult.data.data.aiResponse;
        const processingTime = aiResponse?.processingTime || 0;
        const tokensUsed = aiResponse?.tokensUsed || 0;
        const aiModel = aiResponse?.aiModel || 'unknown';
        
        console.log(`✅ SUCCESS`);
        console.log(`⏱️  Total Time: ${totalTime}ms`);
        console.log(`🤖 AI Processing: ${processingTime}ms`);
        console.log(`🧠 Model Used: ${aiModel}`);
        console.log(`🔢 Tokens Used: ${tokensUsed}`);
        console.log(`📊 Network + DB: ${totalTime - processingTime}ms`);
        
        // Check if optimization worked
        const optimizationWorked = aiModel === test.expectedModel;
        if (optimizationWorked) {
          console.log(`🚀 OPTIMIZATION SUCCESS: Using ${aiModel} as expected!`);
        } else {
          console.log(`⚠️  Expected ${test.expectedModel} but got ${aiModel}`);
        }
        
        // Speed analysis
        if (totalTime < 1500) {
          console.log(`🚀 EXCELLENT SPEED - Under 1.5 seconds!`);
        } else if (totalTime < 3000) {
          console.log(`✅ GOOD SPEED - Under 3 seconds`);
        } else if (totalTime < 5000) {
          console.log(`⚠️  ACCEPTABLE SPEED - Under 5 seconds`);
        } else {
          console.log(`❌ SLOW - Over 5 seconds`);
        }
        
        // Show response preview
        const responsePreview = aiResponse?.content?.substring(0, 80) || 'No response';
        console.log(`💭 Response: "${responsePreview}${aiResponse?.content?.length > 80 ? '...' : ''}"`);
        
      } else {
        console.log(`❌ FAILED (${messageResult.status})`);
        console.log(`📊 Response: ${messageResult.raw}`);
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
    }
    
    // Wait between tests
    if (i < testQueries.length - 1) {
      console.log('⏳ Waiting 2 seconds...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\n4️⃣ Optimization Summary');
  console.log('=' .repeat(60));
  console.log('✅ What to look for in server logs:');
  console.log('   🚀 MODEL OPTIMIZATION: Using gpt-4o-mini for query length: X chars');
  console.log('   🚀 PROMPT OPTIMIZATION: X chars vs Y chars (Z% reduction)');
  console.log('');
  console.log('🎯 Expected Results:');
  console.log('   • Simple queries should use gpt-4o-mini (faster, cheaper)');
  console.log('   • Complex queries should use gpt-4o (powerful, accurate)');
  console.log('   • Response times should be 40-60% faster for simple queries');
  console.log('   • Token usage should be lower for simple queries');
  
  console.log('\n🎉 Speed optimization test completed!');
}

if (require.main === module) {
  testWithExistingToken().catch(console.error);
}