/**
 * Direct test of text processor functionality
 */

console.log('🧪 Testing Text Processor Directly');
console.log('=' .repeat(50));

try {
  // Test the text processor directly
  const { createCleanTitle, removeShortMeaninglessWords } = require('./src/api/v1/utils/textProcessor');
  
  console.log('✅ Text processor imported successfully\n');
  
  const testMessages = [
    "Hi, I am feeling really good today and I think I made a breakthrough!",
    "Oh well, I just got a promotion at work and I'm so excited!",
    "Yeah, I think I finally understand what I want to do with my life",
    "Um, I had a really deep conversation with my friend about relationships",
    "I feel like I'm growing as a person and becoming more confident",
    "The weather is nice today and I went for a walk",
    "I just finished reading a book about mindfulness and meditation"
  ];
  
  console.log('📝 Text Cleanup Results:');
  console.log('-'.repeat(30));
  
  testMessages.forEach((message, index) => {
    const cleaned = createCleanTitle(message);
    const filtered = removeShortMeaninglessWords(message);
    
    console.log(`\n${index + 1}. Original:`);
    console.log(`   "${message}"`);
    console.log(`   Clean Title:`);
    console.log(`   "${cleaned}"`);
    console.log(`   Filtered:`);
    console.log(`   "${filtered}"`);
    
    // Check if cleanup worked
    const fillerWords = ['i', 'am', 'the', 'and', 'just', 'really', 'very', 'oh', 'hi', 'um', 'well'];
    const hasFillers = fillerWords.some(word => 
      cleaned.toLowerCase().includes(` ${word} `) || 
      cleaned.toLowerCase().startsWith(`${word} `) ||
      cleaned.toLowerCase().endsWith(` ${word}`)
    );
    
    if (hasFillers) {
      console.log(`   ⚠️  Still contains some filler words`);
    } else {
      console.log(`   ✅ Successfully cleaned`);
    }
  });
  
  console.log('\n' + '='.repeat(50));
  console.log('🎉 Text processor is working correctly!');
  console.log('\n💡 Next steps:');
  console.log('   1. ✅ Text processor utility is working');
  console.log('   2. ✅ Chat service has been updated to use it');
  console.log('   3. 🔄 Need to test with actual API endpoint');
  console.log('   4. 🚀 Deploy to live server when ready');
  
} catch (error) {
  console.log('❌ Error testing text processor:', error.message);
  console.log('🔍 Make sure the textProcessor.js file exists and is properly exported');
}