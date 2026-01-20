const EmotionalPromptService = require("./src/api/v1/services/emotionalPrompt.service");

async function testEmotionalRulesIntegration() {
  console.log("🧪 Testing Emotional Rules Integration...\n");

  try {
    // Test 1: Get emotional rules for prompt
    console.log("1. Testing getEmotionalRulesForPrompt():");
    const emotionalRulesPrompt = await EmotionalPromptService.getEmotionalRulesForPrompt();
    console.log("Result:", emotionalRulesPrompt ? "✅ Rules found" : "❌ No rules found");
    if (emotionalRulesPrompt) {
      console.log("Preview:", emotionalRulesPrompt.substring(0, 200) + "...\n");
    }

    // Test 2: Test matching rules
    console.log("2. Testing getMatchingEmotionalRules() with 'anxiety' message:");
    const matchingRules = await EmotionalPromptService.getMatchingEmotionalRules("I'm feeling anxiety about tomorrow");
    console.log("Matching rules found:", matchingRules.length);
    matchingRules.forEach((rule, index) => {
      console.log(`   Rule ${index + 1}: ${rule.trigger} -> ${rule.responseType} (${rule.tone})`);
    });
    console.log();

    // Test 3: Build enhanced system prompt
    console.log("3. Testing buildEnhancedSystemPrompt():");
    const basePrompt = "You are a helpful AI assistant.";
    const enhancedPrompt = await EmotionalPromptService.buildEnhancedSystemPrompt(
      basePrompt, 
      "I'm feeling anxious about my presentation tomorrow"
    );
    
    console.log("Base prompt length:", basePrompt.length);
    console.log("Enhanced prompt length:", enhancedPrompt.length);
    console.log("Enhancement added:", enhancedPrompt.length - basePrompt.length, "characters");
    console.log("\nEnhanced prompt preview:");
    console.log("=".repeat(50));
    console.log(enhancedPrompt.substring(0, 500) + "...");
    console.log("=".repeat(50));

    console.log("\n✅ All tests completed successfully!");

  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
testEmotionalRulesIntegration();