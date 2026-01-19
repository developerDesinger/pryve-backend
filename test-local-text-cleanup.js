/**
 * Test text cleanup feature on local server
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3400/api/v1';
const TEST_EMAIL = 'designercoo+1@gmail.com';
const TEST_PASSWORD = '12345678a';

async function testLocalTextCleanup() {
  console.log('🧪 Testing Text Cleanup Feature - Local Server');
  console.log('=' .repeat(60));
  console.log(`🔗 Server: ${BASE_URL}`);
  console.log(`📧 User: ${TEST_EMAIL}\n`);

  try {
    // Step 1: Try to create the user locally
    console.log('1️⃣ Creating/checking user locally...');
    try {
      const createResponse = await axios.post(`${BASE_URL}/users/create`, {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        name: 'Test User Local'
      });
      console.log('✅ User created successfully');
    } catch (createError) {
      if (createError.response?.status === 409) {
        console.log('✅ User already exists');
      } else {
        console.log('⚠️  User creation failed:', createError.response?.data?.message || createError.message);
      }
    }

    // Step 2: Login to get token
    console.log('\n2️⃣ Logging in locally...');
    const loginResponse = await axios.post(`${BASE_URL}/users/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    if (!loginResponse.data.success) {
      console.log('❌ Login failed:', loginResponse.data.message);
      
      // Try to set password if login failed
      console.log('\n🔧 Trying to set password...');
      try {
        const updateResponse = await axios.post(`${BASE_URL}/users/update-password`, {
          email: TEST_EMAIL,
          newPassword: TEST_PASSWORD
        });
        console.log('✅ Password updated, trying login again...');
        
        const retryLogin = await axios.post(`${BASE_URL}/users/login`, {
          email: TEST_EMAIL,
          password: TEST_PASSWORD
        });
        
        if (retryLogin.data.success) {
          console.log('✅ Login successful after password update');
        } else {
          console.log('❌ Login still failed:', retryLogin.data.message);
          return;
        }
      } catch (updateError) {
        console.log('❌ Password update failed:', updateError.response?.data?.message || updateError.message);
        return;
      }
    } else {
      console.log('✅ Login successful');
    }

    const token = loginResponse.data.data.token;
    const userId = loginResponse.data.data.user.id;
    console.log(`👤 User ID: ${userId}`);
    console.log(`🔑 Token: ${token.substring(0, 20)}...\n`);

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Step 3: Create some test messages with filler words
    console.log('3️⃣ Creating test messages with filler words...');
    
    // First create a chat
    const chatResponse = await axios.post(`${BASE_URL}/chats`, {
      name: 'Test Chat for Text Cleanup'
    }, { headers });
    
    const chatId = chatResponse.data.data.id;
    console.log(`💬 Created chat: ${chatId}`);
    
    // Create messages with lots of filler words
    const testMessages = [
      "Hi, I am feeling really good today and I think I made a breakthrough!",
      "Oh well, I just got a promotion at work and I'm so excited!",
      "Yeah, I think I finally understand what I want to do with my life",
      "Um, I had a really deep conversation with my friend about relationships",
      "I feel like I'm growing as a person and becoming more confident"
    ];
    
    for (const message of testMessages) {
      try {
        await axios.post(`${BASE_URL}/chats/${chatId}/messages`, {
          content: message,
          isFromAI: false
        }, { headers });
        console.log(`✅ Created message: "${message.substring(0, 40)}..."`);
      } catch (msgError) {
        console.log(`⚠️  Failed to create message: ${msgError.response?.data?.message || msgError.message}`);
      }
    }

    // Step 4: Test the journey messages endpoint
    console.log('\n4️⃣ Testing Journey Messages Endpoint...');
    console.log('-'.repeat(50));

    const categories = ['growth-moments', 'heart-to-hearts', 'goals-achieved', 'breakthrough-days'];
    
    for (const category of categories) {
      try {
        console.log(`\n📋 Testing category: ${category}`);
        
        const response = await axios.get(
          `${BASE_URL}/chats/journey/messages?category=${category}&limit=10`,
          { headers, timeout: 10000 }
        );
        
        if (response.data.success && response.data.data.items.length > 0) {
          console.log(`✅ Found ${response.data.data.items.length} items`);
          console.log('📝 Sample titles (should be cleaned):');
          
          response.data.data.items.slice(0, 3).forEach((item, index) => {
            console.log(`   ${index + 1}. "${item.title}"`);
            
            // Check if title contains filler words
            const fillerWords = ['i', 'am', 'the', 'and', 'just', 'really', 'very', 'oh', 'hi', 'um', 'well'];
            const foundFillers = fillerWords.filter(word => 
              item.title.toLowerCase().includes(` ${word} `) || 
              item.title.toLowerCase().startsWith(`${word} `) ||
              item.title.toLowerCase().endsWith(` ${word}`)
            );
            
            if (foundFillers.length > 0) {
              console.log(`      ⚠️  Still contains: ${foundFillers.join(', ')}`);
            } else {
              console.log(`      ✅ Appears cleaned`);
            }
          });
        } else {
          console.log(`⚠️  No items found for ${category}`);
        }
        
      } catch (error) {
        console.log(`❌ Error testing ${category}:`, error.response?.data?.message || error.message);
        
        if (error.message.includes('createCleanTitle')) {
          console.log('🔍 Error mentions createCleanTitle - import issue detected');
        }
      }
    }

  } catch (error) {
    console.log('❌ Test failed:', error.response?.data?.message || error.message);
    console.log('📊 Full error:', error.response?.data || error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🏁 Local test completed');
}

testLocalTextCleanup();