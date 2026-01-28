const axios = require('axios');

const BASE_URL = 'https://pryve-backend.projectco.space/api/v1';

async function fixHeartToHeartsIssue() {
  console.log('🔧 Heart-to-Hearts API Issue Diagnosis & Fix');
  console.log('=' .repeat(60));
  
  console.log('\n🔍 ISSUE ANALYSIS:');
  console.log('The URL you provided is an OAuth redirect, not an API token.');
  console.log('Heart-to-hearts requires:');
  console.log('  ✓ Valid JWT token (from login)');
  console.log('  ✓ User messages (not AI messages)');
  console.log('  ✓ Messages that are favorited');
  console.log('  ✓ Messages that aren\'t deleted');
  
  console.log('\n📋 SOLUTION STEPS:');
  console.log('1. Get a proper authentication token');
  console.log('2. Create/favorite some user messages');
  console.log('3. Test the heart-to-hearts endpoint');
  
  // Step 1: Try to get a token (you'll need to provide credentials)
  console.log('\n1️⃣ Getting Authentication Token...');
  console.log('-'.repeat(40));
  
  // You need to replace these with actual test credentials
  const testCredentials = {
    email: 'your-test-email@example.com',
    password: 'your-test-password'
  };
  
  console.log('⚠️  IMPORTANT: You need to provide real credentials');
  console.log('Edit this file and replace the testCredentials with:');
  console.log('  - Your actual email and password, OR');
  console.log('  - Create a test account first');
  
  try {
    // Attempt login (will likely fail with dummy credentials)
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, testCredentials);
    
    if (loginResponse.data.success && loginResponse.data.data.token) {
      const token = loginResponse.data.data.token;
      console.log('✅ Login successful!');
      
      // Test the heart-to-hearts endpoint
      await testAndFixHeartToHearts(token);
      
    } else {
      console.log('❌ Login failed - need real credentials');
      showManualInstructions();
    }
    
  } catch (error) {
    console.log('❌ Login failed:', error.message);
    showManualInstructions();
  }
}

async function testAndFixHeartToHearts(token) {
  console.log('\n2️⃣ Testing Heart-to-Hearts Endpoint...');
  console.log('-'.repeat(40));
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  try {
    // Test heart-to-hearts endpoint
    const response = await axios.get(
      `${BASE_URL}/chats/journey/messages?category=heart-to-hearts&limit=10`,
      { headers }
    );
    
    console.log(`✅ Status: ${response.status}`);
    
    if (response.data.success && response.data.data?.items) {
      const items = response.data.data.items;
      console.log(`📊 Found ${items.length} heart-to-hearts messages`);
      
      if (items.length === 0) {
        console.log('\n⚠️ No heart-to-hearts found - this is the issue!');
        await createTestDataForHeartToHearts(token);
      } else {
        console.log('✅ Heart-to-hearts working correctly!');
        items.forEach((item, index) => {
          console.log(`${index + 1}. ${item.title || item.content?.substring(0, 50)}...`);
        });
      }
    }
    
  } catch (error) {
    console.log('❌ Heart-to-hearts test failed:', error.message);
    
    if (error.response?.status === 401) {
      console.log('🔑 Token issue - need to re-authenticate');
    }
  }
}

async function createTestDataForHeartToHearts(token) {
  console.log('\n3️⃣ Creating Test Data for Heart-to-Hearts...');
  console.log('-'.repeat(40));
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  try {
    // Step 1: Create a chat
    console.log('📝 Creating test chat...');
    const chatResponse = await axios.post(`${BASE_URL}/chats`, {
      name: 'Heart-to-Hearts Test Chat',
      type: 'personal'
    }, { headers });
    
    if (chatResponse.data.success) {
      const chatId = chatResponse.data.data.id;
      console.log(`✅ Chat created: ${chatId}`);
      
      // Step 2: Create emotional user messages
      const emotionalMessages = [
        "I had such a meaningful conversation with my partner today about our future dreams.",
        "Feeling grateful for all the support from my family during tough times.",
        "Today I realized how much I've grown as a person over the past year."
      ];
      
      for (const content of emotionalMessages) {
        console.log(`📝 Creating message: "${content.substring(0, 30)}..."`);
        
        const messageResponse = await axios.post(`${BASE_URL}/chats/${chatId}/messages`, {
          content: content,
          isFromAI: false
        }, { headers });
        
        if (messageResponse.data.success) {
          const messageId = messageResponse.data.data.id;
          console.log(`✅ Message created: ${messageId}`);
          
          // Step 3: Favorite the message
          console.log('⭐ Favoriting message...');
          const favoriteResponse = await axios.post(`${BASE_URL}/messages/${messageId}/favorite`, {}, { headers });
          
          if (favoriteResponse.data.success) {
            console.log('✅ Message favorited!');
          } else {
            console.log('⚠️ Failed to favorite message');
          }
          
          // Wait a bit for processing
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Step 4: Test heart-to-hearts again
      console.log('\n4️⃣ Testing Heart-to-Hearts Again...');
      console.log('-'.repeat(40));
      
      const finalTest = await axios.get(
        `${BASE_URL}/chats/journey/messages?category=heart-to-hearts&limit=10`,
        { headers }
      );
      
      if (finalTest.data.success && finalTest.data.data?.items) {
        const items = finalTest.data.data.items;
        console.log(`🎉 SUCCESS! Found ${items.length} heart-to-hearts messages`);
        
        items.forEach((item, index) => {
          console.log(`${index + 1}. ${item.title || item.content?.substring(0, 50)}...`);
        });
      }
    }
    
  } catch (error) {
    console.log('❌ Error creating test data:', error.message);
    
    if (error.response) {
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

function showManualInstructions() {
  console.log('\n📋 MANUAL INSTRUCTIONS:');
  console.log('=' .repeat(60));
  
  console.log('\n🔑 Step 1: Get a Valid Token');
  console.log('Option A - Use Postman:');
  console.log('  1. POST to: https://pryve-backend.projectco.space/api/v1/auth/login');
  console.log('  2. Body: {"email": "your-email", "password": "your-password"}');
  console.log('  3. Copy the token from response.data.token');
  
  console.log('\nOption B - Use existing test script:');
  console.log('  1. Edit test-with-your-token.js');
  console.log('  2. Replace "paste_your_token_here" with your actual token');
  console.log('  3. Run: node test-with-your-token.js');
  
  console.log('\n💝 Step 2: Create Heart-to-Hearts Data');
  console.log('In your app or via API:');
  console.log('  1. Create personal/emotional messages (not AI messages)');
  console.log('  2. Favorite those messages (tap heart icon or use API)');
  console.log('  3. Wait for emotional processing (few seconds)');
  
  console.log('\n🧪 Step 3: Test the Endpoint');
  console.log('curl -H "Authorization: Bearer YOUR_TOKEN" \\');
  console.log('  "https://pryve-backend.projectco.space/api/v1/chats/journey/messages?category=heart-to-hearts&limit=10"');
  
  console.log('\n🔍 Common Issues:');
  console.log('  ❌ Using OAuth redirect URL instead of JWT token');
  console.log('  ❌ No favorited user messages exist');
  console.log('  ❌ Only AI messages are favorited (heart-to-hearts needs user messages)');
  console.log('  ❌ Messages are deleted or user is different');
  console.log('  ❌ Token is expired or invalid');
}

// Run the fix
fixHeartToHeartsIssue().catch(console.error);