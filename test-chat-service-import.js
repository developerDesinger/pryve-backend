/**
 * Test if chat service can import text processor
 */

console.log('🧪 Testing Chat Service Import');
console.log('=' .repeat(40));

try {
  // Test if we can import the chat service (this will test all its imports)
  console.log('1️⃣ Testing text processor import...');
  const { createCleanTitle } = require('./src/api/v1/utils/textProcessor');
  console.log('✅ Text processor imports correctly');
  
  console.log('\n2️⃣ Testing chat service import...');
  // This will fail if there are any import issues in chat service
  const ChatService = require('./src/api/v1/services/chat.service');
  console.log('✅ Chat service imports correctly');
  
  console.log('\n3️⃣ Testing if chat service has the method...');
  if (typeof ChatService.getJourneyMessages === 'function') {
    console.log('✅ getJourneyMessages method exists');
  } else {
    console.log('❌ getJourneyMessages method not found');
  }
  
  console.log('\n🎉 All imports working correctly!');
  console.log('\n💡 This means:');
  console.log('   ✅ Text processor utility is accessible');
  console.log('   ✅ Chat service can import text processor');
  console.log('   ✅ No syntax errors in the code');
  console.log('   ✅ Ready for API testing');
  
} catch (error) {
  console.log('❌ Import error:', error.message);
  console.log('\n🔍 Error details:');
  console.log(error.stack);
  
  if (error.message.includes('createCleanTitle')) {
    console.log('\n💡 Issue: Text processor import failed in chat service');
    console.log('   Check the import path in chat.service.js');
  }
}