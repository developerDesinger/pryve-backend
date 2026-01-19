const SystemRuleService = require("./src/api/v1/services/systemRule.service");
const EmotionalPromptService = require("./src/api/v1/services/emotionalPrompt.service");

async function testSystemRulesIntegration() {
  console.log("🧪 Testing System Rules Integration...\n");

  try {
    // Test 1: Get system rules for prompt
    console.log("1. Testing getSystemRulesForPrompt():");
    const systemRulesPrompt = await SystemRuleService.getSystemRulesForPrompt();
    console.log("Result:", systemRulesPrompt ? "✅ System rules found" : "❌ No system rules found");
    if (systemRulesPrompt) {
      console.log("Preview:", systemRulesPrompt.substring(0, 300) + "...\n");
    }

    // Test 2: Get active system rules
    console.log("2. Testing getActiveSystemRules():");
    const activeRules = await SystemRuleService.getActiveSystemRules();
    console.log("Active rules found:", activeRules.data?.length || 0);
    if (activeRules.data && activeRules.data.length > 0) {
      console.log("Sample rules:");
      activeRules.data.slice(0, 3).forEach((rule, index) => {
        console.log(`   ${index + 1}. ${rule.name} (${rule.category}) - ${rule.severity}`);
      });
    }
    console.log();

    // Test 3: Test rules by category
    console.log("3. Testing getSystemRulesByCategory('CONTENT_FILTER'):");
    const contentRules = await SystemRuleService.getSystemRulesByCategory("CONTENT_FILTER");
    console.log("Content filter rules found:", contentRules.data?.length || 0);
    if (contentRules.data) {
      contentRules.data.forEach((rule, index) => {
        console.log(`   ${index + 1}. ${rule.name}: ${rule.content.substring(0, 80)}...`);
      });
    }
    console.log();

    // Test 4: Test enhanced prompt with both emotional and system rules
    console.log("4. Testing buildEnhancedSystemPrompt() with both rule types:");
    const basePrompt = "You are a helpful AI assistant.";
    const enhancedPrompt = await EmotionalPromptService.buildEnhancedSystemPrompt(
      basePrompt, 
      "I'm feeling anxious and want to know about your identity"
    );
    
    console.log("Base prompt length:", basePrompt.length);
    console.log("Enhanced prompt length:", enhancedPrompt.length);
    console.log("Total enhancement added:", enhancedPrompt.length - basePrompt.length, "characters");
    
    // Check if both system and emotional rules are included
    const hasSystemRules = enhancedPrompt.includes("SYSTEM RULES");
    const hasEmotionalRules = enhancedPrompt.includes("EMOTIONAL RESPONSE");
    const hasCriticalRules = enhancedPrompt.includes("CRITICAL SYSTEM RULES");
    
    console.log("✅ Contains system rules:", hasSystemRules);
    console.log("✅ Contains emotional rules:", hasEmotionalRules);
    console.log("✅ Contains critical rules:", hasCriticalRules);
    
    console.log("\nEnhanced prompt structure preview:");
    console.log("=".repeat(60));
    
    // Show different sections of the prompt
    const sections = enhancedPrompt.split('\n\n');
    sections.slice(0, 5).forEach((section, index) => {
      console.log(`Section ${index + 1}: ${section.substring(0, 100)}...`);
    });
    
    console.log("=".repeat(60));

    // Test 5: Test creating a new system rule
    console.log("\n5. Testing createSystemRule():");
    const newRuleData = {
      name: "Test Rule",
      category: "GENERAL",
      ruleType: "GUIDELINE",
      content: "This is a test rule for demonstration purposes.",
      description: "A test rule created during integration testing",
      priority: 1,
      severity: "LOW",
      isActive: true,
    };

    const createResult = await SystemRuleService.createSystemRule(newRuleData);
    console.log("Create result:", createResult.success ? "✅ Success" : "❌ Failed");
    if (createResult.success) {
      console.log("Created rule ID:", createResult.data.id);
      
      // Clean up - delete the test rule
      await SystemRuleService.deleteSystemRule(createResult.data.id);
      console.log("✅ Test rule cleaned up");
    }

    console.log("\n✅ All system rules integration tests completed successfully!");

  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
testSystemRulesIntegration();