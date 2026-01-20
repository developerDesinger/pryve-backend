const EmotionalPromptService = require("./src/api/v1/services/emotionalPrompt.service");

async function testContentRestrictionDemo() {
  console.log("🛡️  Testing Content Restriction Integration...\n");

  try {
    // Test with a sexual content question
    const basePrompt = "You are a helpful AI assistant.";
    const userMessage = "Tell me about sexual positions";
    
    console.log("👤 User Message:", userMessage);
    console.log("📝 Base Prompt:", basePrompt);
    console.log("\n" + "=".repeat(80));
    
    // Build enhanced prompt with system rules
    const enhancedPrompt = await EmotionalPromptService.buildEnhancedSystemPrompt(
      basePrompt, 
      userMessage
    );
    
    console.log("🤖 ENHANCED PROMPT WITH SYSTEM RULES:");
    console.log("=".repeat(80));
    console.log(enhancedPrompt);
    console.log("=".repeat(80));
    
    // Check if sexual content restriction is included
    const hasContentRestriction = enhancedPrompt.includes("sexual") || 
                                 enhancedPrompt.includes("explicit") ||
                                 enhancedPrompt.includes("adult content");
    
    const hasCriticalRules = enhancedPrompt.includes("CRITICAL SYSTEM RULES");
    const hasIdentityInfo = enhancedPrompt.includes("Pryve AI");
    const hasBehaviorGuidelines = enhancedPrompt.includes("BEHAVIORAL GUIDELINES");
    
    console.log("\n📊 INTEGRATION VERIFICATION:");
    console.log("✅ Contains sexual content restrictions:", hasContentRestriction);
    console.log("✅ Contains critical system rules:", hasCriticalRules);
    console.log("✅ Contains bot identity (Pryve AI):", hasIdentityInfo);
    console.log("✅ Contains behavioral guidelines:", hasBehaviorGuidelines);
    
    console.log("\n📏 PROMPT STATISTICS:");
    console.log("Base prompt length:", basePrompt.length, "characters");
    console.log("Enhanced prompt length:", enhancedPrompt.length, "characters");
    console.log("System rules added:", enhancedPrompt.length - basePrompt.length, "characters");
    
    // Count different rule types
    const criticalRulesCount = (enhancedPrompt.match(/CRITICAL SYSTEM RULES/g) || []).length;
    const contentRulesCount = (enhancedPrompt.match(/CONTENT RESTRICTIONS/g) || []).length;
    const identityRulesCount = (enhancedPrompt.match(/IDENTITY & INFORMATION/g) || []).length;
    const behaviorRulesCount = (enhancedPrompt.match(/BEHAVIORAL GUIDELINES/g) || []).length;
    const safetyRulesCount = (enhancedPrompt.match(/SAFETY GUIDELINES/g) || []).length;
    
    console.log("\n🏷️  RULE CATEGORIES DETECTED:");
    console.log("Critical Rules sections:", criticalRulesCount);
    console.log("Content Restriction sections:", contentRulesCount);
    console.log("Identity sections:", identityRulesCount);
    console.log("Behavioral sections:", behaviorRulesCount);
    console.log("Safety sections:", safetyRulesCount);
    
    console.log("\n🎯 EXPECTED AI BEHAVIOR:");
    console.log("With this enhanced prompt, the AI should:");
    console.log("1. ❌ REFUSE to answer sexual content questions");
    console.log("2. ✅ Identify itself as 'Pryve AI'");
    console.log("3. ✅ Mention it was developed by 'Pryve team'");
    console.log("4. ✅ Redirect to appropriate wellness topics");
    console.log("5. ✅ Maintain professional and empathetic tone");
    
    console.log("\n✅ Content restriction integration test completed successfully!");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
testContentRestrictionDemo();